-- Email notifications: new message fallback + city growth digest.
-- Запуск: Supabase SQL Editor или psql на self-hosted Timeweb.
--
-- После миграции:
-- 1) Убедитесь, что SMTP_* и INTERNAL_EMAIL_SECRET (или INTERNAL_PUSH_SECRET) заданы в .env.app
-- 2) app_config.push_internal_secret должен совпадать с INTERNAL_* в Next.js
-- 3) На VPS при hairpin/NAT замените URL на http://172.17.0.1:3001/api/email/... (см. push dispatch)

create extension if not exists pg_cron;

alter table public.profiles
  add column if not exists last_message_email_at timestamptz,
  add column if not exists last_city_growth_email_at timestamptz;

comment on column public.profiles.last_message_email_at is
  'Последнее email-уведомление о непрочитанном ЛС (fallback без push, не чаще 1 раз в сутки)';
comment on column public.profiles.last_city_growth_email_at is
  'Последний еженедельный дайджест прироста контактов в городе';

insert into public.app_config(key, value) values
  ('email_new_message_url', 'https://zeip.ru/api/email/new-message'),
  ('email_city_growth_url', 'https://zeip.ru/api/email/city-growth')
on conflict (key) do nothing;

-- Кандидаты на email о новом сообщении (без push-подписки, есть непрочитанные ЛС)
create or replace function public.get_profiles_for_message_email()
returns table (profile_id uuid, auth_user_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select distinct p.id as profile_id, p.auth_user_id
  from public.profiles p
  join public.chat_members cm_me
    on cm_me.user_id = p.id
  join public.chat_members cm_other
    on cm_other.chat_id = cm_me.chat_id
   and cm_other.user_id <> cm_me.user_id
  join public.messages m
    on m.chat_id = cm_me.chat_id
   and m.sender_id = cm_other.user_id
   and m.created_at > coalesce(cm_me.last_read_at, '1970-01-01'::timestamptz)
  where p.auth_user_id is not null
    and (
      p.last_message_email_at is null
      or p.last_message_email_at < now() - interval '24 hours'
    )
    and not exists (
      select 1
      from public.push_subscriptions ps
      where ps.profile_id = p.id
    );
$$;

revoke all on function public.get_profiles_for_message_email() from public;
grant execute on function public.get_profiles_for_message_email() to service_role;

comment on function public.get_profiles_for_message_email() is
  'Профили для fallback email о непрочитанных ЛС: нет push-подписки, cooldown 24ч';

-- Города с приростом >= 50 за последние 7 дней
create or replace function public.get_city_growth_email_batches()
returns table (city text, new_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select p.city, count(*)::bigint as new_count
  from public.profiles p
  where coalesce(trim(p.city), '') <> ''
    and p.created_at > now() - interval '7 days'
  group by p.city
  having count(*) >= 50;
$$;

revoke all on function public.get_city_growth_email_batches() from public;
grant execute on function public.get_city_growth_email_batches() to service_role;

-- pg_cron: fallback email о новом сообщении — каждые 30 мин
select cron.unschedule(jobid)
from cron.job
where jobname = 'zeip-new-message-email';

select cron.schedule(
  'zeip-new-message-email',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := (select value from public.app_config where key = 'email_new_message_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', (select value from public.app_config where key = 'push_internal_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) as request_id;
  $$
);

-- pg_cron: дайджест прироста в городе — ежедневно 09:00 UTC
select cron.unschedule(jobid)
from cron.job
where jobname = 'zeip-city-growth-email';

select cron.schedule(
  'zeip-city-growth-email',
  '0 9 * * *',
  $$
  select net.http_post(
    url := (select value from public.app_config where key = 'email_city_growth_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', (select value from public.app_config where key = 'push_internal_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) as request_id;
  $$
);

notify pgrst, 'reload schema';
