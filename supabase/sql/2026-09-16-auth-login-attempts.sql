-- Журнал попыток входа: защита от brute force / credential stuffing.
-- Политика: 5 неудач на email → пауза 15 мин; 20 неудач на IP / 15 мин.
-- Self-hosted Timeweb:
--   ssh root@186.246.2.104
--   cd /root/zeip && git pull --ff-only
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < /root/zeip/my-app/supabase/sql/2026-09-16-auth-login-attempts.sql

create table if not exists public.auth_login_attempts (
  id                uuid primary key default gen_random_uuid(),
  email_normalized  text not null,
  ip_address        text not null default '',
  success           boolean not null default false,
  created_at        timestamptz not null default now()
);

create index if not exists idx_auth_login_attempts_email_created
  on public.auth_login_attempts (email_normalized, created_at desc);

create index if not exists idx_auth_login_attempts_ip_created
  on public.auth_login_attempts (ip_address, created_at desc)
  where success = false;

comment on table public.auth_login_attempts is
  'Попытки входа. Нет публичного доступа; пишет service_role через try_auth_login.';

alter table public.auth_login_attempts enable row level security;

drop policy if exists auth_login_attempts_deny_all on public.auth_login_attempts;
create policy auth_login_attempts_deny_all
  on public.auth_login_attempts
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.auth_login_attempts from public, anon, authenticated;
grant all on table public.auth_login_attempts to service_role;

create or replace function public.try_auth_login(
  p_email text,
  p_ip text,
  p_success boolean default false,
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
  v_now timestamptz := now();
  v_window interval := interval '15 minutes';
  v_lock_minutes int := 15;
  v_email_max int := 5;
  v_ip_max int := 20;
  v_email_fails int := 0;
  v_ip_fails int := 0;
  v_email_oldest timestamptz;
  v_ip_oldest timestamptz;
  v_retry int := 0;
  v_id uuid;
begin
  v_email := lower(trim(coalesce(p_email, '')));
  v_ip := trim(coalesce(p_ip, ''));

  if v_email = '' or position('@' in v_email) = 0 then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'invalid_email',
      'retry_after_seconds', 0,
      'email_fails_window', 0,
      'ip_fails_window', 0
    );
  end if;

  select count(*), min(created_at)
    into v_email_fails, v_email_oldest
  from public.auth_login_attempts
  where email_normalized = v_email
    and success = false
    and created_at >= v_now - v_window;

  if v_ip <> '' then
    select count(*), min(created_at)
      into v_ip_fails, v_ip_oldest
    from public.auth_login_attempts
    where ip_address = v_ip
      and success = false
      and created_at >= v_now - v_window;
  end if;

  if v_email_fails >= v_email_max then
    v_retry := greatest(
      0,
      ceil(extract(epoch from (v_email_oldest + (v_lock_minutes || ' minutes')::interval - v_now)))::int
    );
    return jsonb_build_object(
      'allowed', false,
      'reason', 'email_lockout',
      'retry_after_seconds', v_retry,
      'email_fails_window', v_email_fails,
      'ip_fails_window', v_ip_fails
    );
  end if;

  if v_ip <> '' and v_ip_fails >= v_ip_max then
    v_retry := greatest(
      0,
      ceil(extract(epoch from (v_ip_oldest + v_window - v_now)))::int
    );
    return jsonb_build_object(
      'allowed', false,
      'reason', 'ip_lockout',
      'retry_after_seconds', v_retry,
      'email_fails_window', v_email_fails,
      'ip_fails_window', v_ip_fails
    );
  end if;

  if p_dry_run then
    return jsonb_build_object(
      'allowed', true,
      'reason', 'ok',
      'retry_after_seconds', 0,
      'email_fails_window', v_email_fails,
      'ip_fails_window', v_ip_fails
    );
  end if;

  insert into public.auth_login_attempts (email_normalized, ip_address, success)
  values (v_email, v_ip, coalesce(p_success, false))
  returning id into v_id;

  if coalesce(p_success, false) then
    delete from public.auth_login_attempts
    where email_normalized = v_email
      and success = false;
  end if;

  return jsonb_build_object(
    'allowed', true,
    'reason', 'ok',
    'retry_after_seconds', 0,
    'email_fails_window', v_email_fails,
    'ip_fails_window', v_ip_fails,
    'id', v_id
  );
end;
$$;

revoke all on function public.try_auth_login(text, text, boolean, boolean) from public, anon, authenticated;
grant execute on function public.try_auth_login(text, text, boolean, boolean) to service_role;
