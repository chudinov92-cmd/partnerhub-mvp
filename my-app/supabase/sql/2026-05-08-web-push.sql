-- Web Push: таблицы подписок, внутренний конфиг, pg_net → Next.js dispatch.
-- Запуск: Supabase SQL Editor или psql от роли supabase_admin/postgres на self-hosted Timeweb.
-- После первого запуска: UPDATE public.app_config SET value='<секрет>' WHERE key='push_internal_secret';
-- Значение должно совпадать с INTERNAL_PUSH_SECRET в env Next.js (.env.app).

create extension if not exists pg_net;

-- Подписки Web Push (пишет только service_role из API Next.js; RLS включён, политик нет — доступ только через service_role)

create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  endpoint     text not null,
  p256dh       text not null,
  auth_key     text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (profile_id, endpoint)
);

create index if not exists idx_push_subscriptions_profile
  on public.push_subscriptions (profile_id);

alter table public.push_subscriptions enable row level security;

-- Внутренний конфиг (секрет и URL); не открывать anon/authenticated

create table if not exists public.app_config (
  key   text primary key,
  value text not null
);

revoke all on table public.app_config from PUBLIC;
revoke all on table public.app_config from anon, authenticated;

revoke all on table public.push_subscriptions from PUBLIC;
revoke all on table public.push_subscriptions from anon, authenticated;

grant select, insert, update, delete on table public.app_config to service_role;
grant select, insert, update, delete on table public.push_subscriptions to service_role;

grant select on table public.app_config to postgres;
grant insert on table public.app_config to postgres;

insert into public.app_config(key, value) values
  ('push_dispatch_url', 'https://zeip.ru/api/push/dispatch'),
  ('push_internal_secret', 'CHANGE_ME_TO_LONG_RANDOM_STRING')
on conflict (key) do nothing;

create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url    text;
  v_secret text;
begin
  select c.value into v_url
  from public.app_config c
  where c.key = 'push_dispatch_url';

  select c.value into v_secret
  from public.app_config c
  where c.key = 'push_internal_secret';

  if coalesce(v_url, '') = '' or coalesce(v_secret, '') = '' or v_secret = 'CHANGE_ME_TO_LONG_RANDOM_STRING' then
    return new;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Internal-Secret', v_secret
    ),
    body := jsonb_build_object('message_id', new.id::text),
    timeout_milliseconds := 8000
  );

  return new;
exception
  when others then
    return new;
end;
$$;

drop trigger if exists trg_messages_notify_push on public.messages;
create trigger trg_messages_notify_push
after insert on public.messages
for each row execute function public.notify_new_message();
