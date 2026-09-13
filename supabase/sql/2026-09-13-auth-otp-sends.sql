-- Журнал отправок OTP (регистрация + сброс пароля): защита от email bombing.
-- Политика: 60 с между письмами на email, 4 / 24 ч на email, 8 / 24 ч на IP.
-- Self-hosted Timeweb:
--   ssh root@186.246.2.104
--   cd /root/zeip && git pull --ff-only
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < /root/zeip/my-app/supabase/sql/2026-09-13-auth-otp-sends.sql

create table if not exists public.auth_otp_sends (
  id                uuid primary key default gen_random_uuid(),
  email_normalized  text not null,
  ip_address        text not null default '',
  purpose           text not null,
  created_at        timestamptz not null default now(),
  constraint auth_otp_sends_purpose_check
    check (purpose in ('signup', 'recovery'))
);

create index if not exists idx_auth_otp_sends_email_created
  on public.auth_otp_sends (email_normalized, created_at desc);

create index if not exists idx_auth_otp_sends_ip_created
  on public.auth_otp_sends (ip_address, created_at desc);

comment on table public.auth_otp_sends is
  'Успешные/учтённые отправки OTP. Нет публичного доступа; пишет service_role через try_auth_otp_send.';

alter table public.auth_otp_sends enable row level security;

drop policy if exists auth_otp_sends_deny_all on public.auth_otp_sends;
create policy auth_otp_sends_deny_all
  on public.auth_otp_sends
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.auth_otp_sends from public, anon, authenticated;
grant all on table public.auth_otp_sends to service_role;

create or replace function public.try_auth_otp_send(
  p_email text,
  p_ip text,
  p_purpose text,
  p_dry_run boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_ip text;
  v_purpose text;
  v_now timestamptz := now();
  v_window interval := interval '24 hours';
  v_window_start timestamptz;
  v_cooldown int := 60;
  v_email_max int := 4;
  v_ip_max int := 8;
  v_email_count int := 0;
  v_ip_count int := 0;
  v_email_last timestamptz;
  v_email_oldest timestamptz;
  v_ip_oldest timestamptz;
  v_retry int := 0;
  v_id uuid;
begin
  v_email := lower(trim(coalesce(p_email, '')));
  if v_email = '' or position('@' in v_email) = 0 then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'invalid_email',
      'retry_after_seconds', 0,
      'email_sends_24h', 0,
      'ip_sends_24h', 0
    );
  end if;

  v_ip := nullif(trim(coalesce(p_ip, '')), '');
  v_purpose := lower(trim(coalesce(p_purpose, 'signup')));
  if v_purpose not in ('signup', 'recovery') then
    v_purpose := 'signup';
  end if;

  v_window_start := v_now - v_window;

  perform pg_advisory_xact_lock(881001, hashtext(v_email));
  if v_ip is not null then
    perform pg_advisory_xact_lock(881002, hashtext(v_ip));
  end if;

  select count(*)::int, max(created_at), min(created_at)
    into v_email_count, v_email_last, v_email_oldest
  from public.auth_otp_sends
  where email_normalized = v_email
    and created_at >= v_window_start;

  v_email_count := coalesce(v_email_count, 0);

  if v_ip is not null then
    select count(*)::int, min(created_at)
      into v_ip_count, v_ip_oldest
    from public.auth_otp_sends
    where ip_address = v_ip
      and created_at >= v_window_start;
  end if;

  v_ip_count := coalesce(v_ip_count, 0);

  if v_email_count >= v_email_max then
    v_retry := greatest(
      1,
      ceil(extract(epoch from (v_email_oldest + v_window - v_now)))::int
    );
    return jsonb_build_object(
      'allowed', false,
      'reason', 'email_daily',
      'retry_after_seconds', v_retry,
      'email_sends_24h', v_email_count,
      'ip_sends_24h', v_ip_count
    );
  end if;

  if v_email_last is not null
     and v_email_last > v_now - make_interval(secs => v_cooldown) then
    v_retry := greatest(
      1,
      ceil(extract(epoch from (
        v_email_last + make_interval(secs => v_cooldown) - v_now
      )))::int
    );
    return jsonb_build_object(
      'allowed', false,
      'reason', 'email_cooldown',
      'retry_after_seconds', v_retry,
      'email_sends_24h', v_email_count,
      'ip_sends_24h', v_ip_count
    );
  end if;

  if v_ip is not null and v_ip_count >= v_ip_max then
    v_retry := greatest(
      1,
      ceil(extract(epoch from (v_ip_oldest + v_window - v_now)))::int
    );
    return jsonb_build_object(
      'allowed', false,
      'reason', 'ip_daily',
      'retry_after_seconds', v_retry,
      'email_sends_24h', v_email_count,
      'ip_sends_24h', v_ip_count
    );
  end if;

  if p_dry_run then
    return jsonb_build_object(
      'allowed', true,
      'reason', 'ok',
      'retry_after_seconds', 0,
      'email_sends_24h', v_email_count,
      'ip_sends_24h', v_ip_count
    );
  end if;

  insert into public.auth_otp_sends (email_normalized, ip_address, purpose)
  values (v_email, coalesce(v_ip, ''), v_purpose)
  returning id into v_id;

  v_email_count := v_email_count + 1;
  if v_ip is not null then
    v_ip_count := v_ip_count + 1;
  end if;

  if v_email_count >= v_email_max then
    v_retry := greatest(
      1,
      ceil(extract(epoch from (
        coalesce(v_email_oldest, v_now) + v_window - v_now
      )))::int
    );
  else
    v_retry := v_cooldown;
  end if;

  return jsonb_build_object(
    'allowed', true,
    'reason', 'ok',
    'retry_after_seconds', v_retry,
    'email_sends_24h', v_email_count,
    'ip_sends_24h', v_ip_count,
    'id', v_id
  );
end;
$$;

comment on function public.try_auth_otp_send(text, text, text, boolean) is
  'Проверка и учёт отправки OTP. p_dry_run=true — только статус; false — insert при allow.';

revoke all on function public.try_auth_otp_send(text, text, text, boolean) from public;
grant execute on function public.try_auth_otp_send(text, text, text, boolean) to service_role;

notify pgrst, 'reload schema';
