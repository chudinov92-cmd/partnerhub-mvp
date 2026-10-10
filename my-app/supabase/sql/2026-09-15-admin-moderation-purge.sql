-- Модерация: hard purge аккаунта из админки + бан email от повторной регистрации.
-- RPC только для service_role (Next.js /api/admin/users/*).
--
-- Supabase SQL Editor: https://supabase.zeip.ru
-- VPS:
--   ssh root@186.246.2.104
--   cd /root/zeip/my-app
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < supabase/sql/2026-09-15-admin-moderation-purge.sql

-- =========================
-- 1) Бан email после модерации
-- =========================

create table if not exists public.account_bans (
  email_normalized    text primary key,
  reason              text not null,
  banned_by           uuid references auth.users(id) on delete set null,
  former_profile_id   uuid,
  former_auth_user_id uuid,
  created_at          timestamptz not null default now()
);

comment on table public.account_bans is
  'Email, которым запрещена повторная регистрация после hard purge за нарушение правил.';

alter table public.account_bans enable row level security;

drop policy if exists account_bans_deny_all on public.account_bans;
create policy account_bans_deny_all
  on public.account_bans
  for all
  using (false)
  with check (false);

-- =========================
-- 2) Триггер на auth.users
-- =========================

create or replace function public.prevent_banned_auth_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is not null
     and exists (
       select 1
       from public.account_bans b
       where b.email_normalized = lower(trim(new.email))
     ) then
    raise exception 'ACCOUNT_BANNED'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_banned_auth_signup on auth.users;
create trigger trg_prevent_banned_auth_signup
  before insert on auth.users
  for each row
  execute function public.prevent_banned_auth_signup();

revoke all on function public.prevent_banned_auth_signup() from public, anon, authenticated;

-- =========================
-- 3) Lookup для превью (UUID = profile.id | auth_user_id | auth.users.id)
-- =========================

create or replace function public.admin_lookup_account_for_purge(p_uid uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.profiles%rowtype;
  v_email text;
  v_auth_id uuid;
  v_banned boolean := false;
begin
  if p_uid is null then
    return jsonb_build_object('found', false);
  end if;

  select p.*
  into v_profile
  from public.profiles p
  where p.id = p_uid or p.auth_user_id = p_uid
  limit 1;

  if found then
    v_auth_id := v_profile.auth_user_id;
  else
    select u.id into v_auth_id from auth.users u where u.id = p_uid;
    if v_auth_id is null then
      return jsonb_build_object('found', false);
    end if;
  end if;

  if v_auth_id is not null then
    select u.email into v_email from auth.users u where u.id = v_auth_id;
  end if;

  if v_email is not null then
    v_banned := exists (
      select 1 from public.account_bans b
      where b.email_normalized = lower(trim(v_email))
    );
  end if;

  return jsonb_build_object(
    'found', true,
    'profile_id', v_profile.id,
    'auth_user_id', v_auth_id,
    'full_name', v_profile.full_name,
    'city', v_profile.city,
    'role_title', v_profile.role_title,
    'map_visible', v_profile.map_visible,
    'deleted_at', v_profile.deleted_at,
    'is_blocked', v_profile.is_blocked,
    'is_pro', v_profile.is_pro,
    'email', v_email,
    'email_banned', v_banned,
    'is_admin', exists (
      select 1 from public.admin_users a where a.auth_user_id = v_auth_id
    ),
    'counts', jsonb_build_object(
      'locations', (
        select count(*) from public.locations
        where user_id = v_profile.id
      ),
      'messages_sent', (
        select count(*) from public.messages
        where sender_id = v_profile.id
      ),
      'payments', (
        select count(*) from public.subscription_payments
        where profile_id = v_profile.id
      ),
      'paywall_events', (
        select count(*) from public.paywall_events
        where profile_id = v_profile.id
      )
    )
  );
end;
$$;

-- =========================
-- 4) Hard purge (шаблон 2026-09-11-delete-user-d9242af8.sql)
-- =========================

create or replace function public.admin_purge_account(p_uid uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_target uuid := p_uid;
  v_profile_id uuid;
  v_auth_user_id uuid;
  v_city text;
  v_is_pioneer boolean := false;
  v_paywall int := 0;
  v_activity int := 0;
  v_map_search int := 0;
begin
  if v_target is null then
    return jsonb_build_object('ok', false, 'error', 'uid_is_null');
  end if;

  select p.id, p.auth_user_id, p.city, coalesce(p.is_city_pioneer, false)
  into v_profile_id, v_auth_user_id, v_city, v_is_pioneer
  from public.profiles p
  where p.id = v_target or p.auth_user_id = v_target
  limit 1;

  if v_profile_id is null then
    if exists (select 1 from auth.users where id = v_target) then
      v_auth_user_id := v_target;
    else
      return jsonb_build_object('ok', false, 'error', 'not_found');
    end if;
  end if;

  if v_auth_user_id is not null
     and exists (select 1 from public.admin_users a where a.auth_user_id = v_auth_user_id) then
    return jsonb_build_object(
      'ok', false,
      'error', 'target_is_admin',
      'profile_id', v_profile_id,
      'auth_user_id', v_auth_user_id
    );
  end if;

  if v_is_pioneer and v_city is not null
     and to_regclass('public.city_pioneer_slots') is not null then
    update public.city_pioneer_slots
    set used_count = greatest(0, used_count - 1)
    where city = v_city and used_count > 0;
  end if;

  if v_profile_id is not null then
    if to_regclass('public.paywall_events') is not null then
      delete from public.paywall_events where profile_id = v_profile_id;
      get diagnostics v_paywall = row_count;
    end if;

    if to_regclass('public.map_search_events') is not null then
      delete from public.map_search_events where profile_id = v_profile_id;
      get diagnostics v_map_search = row_count;
    end if;

    if to_regclass('public.user_daily_activity') is not null then
      delete from public.user_daily_activity where profile_id = v_profile_id;
      get diagnostics v_activity = row_count;
    end if;

    if to_regclass('public.cookie_consent_logs') is not null then
      delete from public.cookie_consent_logs where user_id = v_profile_id;
    end if;
    if to_regclass('public.subscription_payments') is not null then
      delete from public.subscription_payments where profile_id = v_profile_id;
    end if;
    if to_regclass('public.profile_share_codes') is not null then
      delete from public.profile_share_codes where profile_id = v_profile_id;
    end if;
    if to_regclass('public.profile_private') is not null then
      delete from public.profile_private where profile_id = v_profile_id;
    end if;
    if to_regclass('public.push_subscriptions') is not null then
      delete from public.push_subscriptions where profile_id = v_profile_id;
    end if;

    delete from public.messages where sender_id = v_profile_id;
    delete from public.useful_contact_pairs
    where profile_low = v_profile_id or profile_high = v_profile_id;
    delete from public.chat_members where user_id = v_profile_id;
    delete from public.chats c
    where not exists (select 1 from public.chat_members cm where cm.chat_id = c.id);
    delete from public.posts where author_id = v_profile_id;
    delete from public.locations where user_id = v_profile_id;
    delete from public.profiles where id = v_profile_id;
  end if;

  if v_auth_user_id is not null then
    delete from public.admin_users where auth_user_id = v_auth_user_id;
    if to_regclass('auth.one_time_tokens') is not null then
      delete from auth.one_time_tokens where user_id = v_auth_user_id;
    end if;
    delete from auth.identities where user_id = v_auth_user_id;
    delete from auth.sessions where user_id = v_auth_user_id;
    delete from auth.refresh_tokens where user_id = v_auth_user_id::text;
    delete from auth.users where id = v_auth_user_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'profile_id', v_profile_id,
    'auth_user_id', v_auth_user_id,
    'paywall_events', v_paywall,
    'map_search', v_map_search,
    'daily_activity', v_activity
  );
end;
$$;

revoke all on function public.admin_lookup_account_for_purge(uuid) from public, anon, authenticated;
revoke all on function public.admin_purge_account(uuid) from public, anon, authenticated;
grant execute on function public.admin_lookup_account_for_purge(uuid) to service_role;
grant execute on function public.admin_purge_account(uuid) to service_role;

comment on function public.admin_lookup_account_for_purge(uuid) is
  'Превью аккаунта перед hard purge. Только service_role.';
comment on function public.admin_purge_account(uuid) is
  'Hard delete профиля + auth + связанные данные. Только service_role.';

-- =========================
-- 5) Email → auth.users.id для lookup в API
-- =========================

create or replace function public.admin_lookup_auth_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = auth, public
stable
as $$
  select u.id
  from auth.users u
  where lower(trim(u.email)) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.admin_lookup_auth_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.admin_lookup_auth_user_id_by_email(text) to service_role;
