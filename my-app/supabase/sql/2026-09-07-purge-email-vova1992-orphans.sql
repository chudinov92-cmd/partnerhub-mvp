-- Hard purge: все profiles + locations (пины) + auth для vova1992_92@mail.ru.
-- Включая осиротевшие профили после Dashboard «Delete user» (auth_user_id = NULL).
--
-- Порядок:
--   1. Выполнить только блок «1. DIAGNOSE» — сверить profile_id.
--   2. Если на карте есть пин с другим именем — добавить UUID в секцию «extra» в блоке PURGE.
--   3. Выполнить блок «2. PURGE» целиком.
--
-- Supabase SQL Editor (https://supabase.zeip.ru): вставить файл и Run.
--
-- VPS:
--   ssh root@186.246.2.104
--   cd /root/zeip/my-app
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < supabase/sql/2026-09-07-purge-email-vova1992-orphans.sql

-- =============================================================================
-- 1. DIAGNOSE (только SELECT, без DELETE)
-- =============================================================================

\echo '=== 1.1 Живой auth ==='
select
  id,
  email,
  created_at,
  last_sign_in_at,
  email_confirmed_at,
  raw_user_meta_data->>'full_name' as meta_name
from auth.users
where lower(email) = lower('vova1992_92@mail.ru')
   or id = '4d4b48e3-531b-40e7-8097-983aa6058e04'::uuid;

\echo '=== 1.2 Identities ==='
select
  i.id as identity_id,
  i.user_id,
  i.provider,
  i.identity_data->>'email' as identity_email
from auth.identities i
where i.user_id in (
        select id from auth.users
        where lower(email) = lower('vova1992_92@mail.ru')
           or id = '4d4b48e3-531b-40e7-8097-983aa6058e04'::uuid
      )
   or lower(coalesce(i.identity_data->>'email', '')) = lower('vova1992_92@mail.ru');

\echo '=== 1.3 Профили, связанные с email (живой auth) ==='
select
  p.id as profile_id,
  p.full_name,
  p.auth_user_id,
  p.map_visible,
  p.deleted_at,
  p.city,
  p.created_at,
  l.id as location_id,
  l.is_active,
  l.lat,
  l.lng
from public.profiles p
left join public.locations l on l.user_id = p.id
where p.auth_user_id in (
  select u.id from auth.users u
  where lower(u.email) = lower('vova1992_92@mail.ru')
     or u.id = '4d4b48e3-531b-40e7-8097-983aa6058e04'::uuid
);

\echo '=== 1.4 Орфаны с именем vova/вова (след Dashboard Delete) ==='
select
  p.id as profile_id,
  p.full_name,
  p.auth_user_id,
  p.map_visible,
  p.deleted_at,
  p.city,
  p.created_at,
  l.id as location_id,
  l.is_active,
  l.lat,
  l.lng
from public.profiles p
left join public.locations l on l.user_id = p.id
where p.auth_user_id is null
  and p.deleted_at is null
  and lower(trim(p.full_name)) in ('vova', 'вова');

\echo '=== 1.5 Все видимые орфаны на карте (сверить глазами) ==='
select
  p.id as profile_id,
  p.full_name,
  p.city,
  p.map_visible,
  p.created_at,
  l.lat,
  l.lng,
  l.is_active
from public.profiles p
left join public.locations l on l.user_id = p.id
where p.auth_user_id is null
  and p.deleted_at is null
  and coalesce(p.map_visible, true) = true
order by p.created_at desc;

\echo '=== 1.6 Сводка: сколько профилей попадёт в purge ==='
with target_auth as (
  select id from auth.users
  where lower(email) = lower('vova1992_92@mail.ru')
     or id = '4d4b48e3-531b-40e7-8097-983aa6058e04'::uuid
),
target_profiles as (
  select p.id
  from public.profiles p
  where p.auth_user_id in (select id from target_auth)
  union
  select p.id
  from public.profiles p
  where p.auth_user_id in (
    select i.user_id from auth.identities i
    where lower(coalesce(i.identity_data->>'email', '')) = lower('vova1992_92@mail.ru')
  )
  union
  select p.id
  from public.profiles p
  where p.auth_user_id is null
    and p.deleted_at is null
    and lower(trim(p.full_name)) in ('vova', 'вова')
)
select count(*) as profiles_to_purge from target_profiles;

-- =============================================================================
-- 2. PURGE (hard delete profiles + locations + auth)
-- =============================================================================

begin;

do $$
declare
  v_email text := 'vova1992_92@mail.ru';
  v_known_auth uuid := '4d4b48e3-531b-40e7-8097-983aa6058e04';
  r record;
  v_paywall int := 0;
  v_activity int := 0;
  v_map_search int := 0;
  v_deleted int := 0;
begin
  create temporary table _purge_profiles (
    profile_id uuid primary key,
    auth_user_id uuid,
    city text,
    is_pioneer boolean
  ) on commit drop;

  -- A) профили, связанные с auth по email
  insert into _purge_profiles (profile_id, auth_user_id, city, is_pioneer)
  select p.id, p.auth_user_id, p.city, coalesce(p.is_city_pioneer, false)
  from public.profiles p
  where p.auth_user_id in (
    select u.id from auth.users u
    where lower(u.email) = lower(v_email)
       or u.id = v_known_auth
  )
  on conflict do nothing;

  -- B) профили по user_id из identities с этим email
  insert into _purge_profiles (profile_id, auth_user_id, city, is_pioneer)
  select p.id, p.auth_user_id, p.city, coalesce(p.is_city_pioneer, false)
  from public.profiles p
  where p.auth_user_id in (
    select i.user_id from auth.identities i
    where lower(coalesce(i.identity_data->>'email', '')) = lower(v_email)
  )
  on conflict do nothing;

  -- C) орфаны с именем vova/вова (Dashboard Delete user → auth_user_id = NULL)
  insert into _purge_profiles (profile_id, auth_user_id, city, is_pioneer)
  select p.id, p.auth_user_id, p.city, coalesce(p.is_city_pioneer, false)
  from public.profiles p
  where p.auth_user_id is null
    and p.deleted_at is null
    and lower(trim(p.full_name)) in ('vova', 'вова')
  on conflict do nothing;

  -- D) extra: добавьте UUID вручную, если диагностика (1.5) показала другие profile_id
  -- insert into _purge_profiles (profile_id, auth_user_id, city, is_pioneer)
  -- select p.id, p.auth_user_id, p.city, coalesce(p.is_city_pioneer, false)
  -- from public.profiles p
  -- where p.id in (
  --   'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid
  -- )
  -- on conflict do nothing;

  if not exists (select 1 from _purge_profiles) then
    raise notice 'Нет профилей для purge. Проверьте диагностику и секцию D (extra).';
  end if;

  for r in select * from _purge_profiles
  loop
    if r.is_pioneer and r.city is not null
       and to_regclass('public.city_pioneer_slots') is not null then
      update public.city_pioneer_slots
      set used_count = greatest(0, used_count - 1)
      where city = r.city and used_count > 0;
    end if;

    if to_regclass('public.paywall_events') is not null then
      delete from public.paywall_events where profile_id = r.profile_id;
      get diagnostics v_paywall = row_count;
    end if;
    if to_regclass('public.map_search_events') is not null then
      delete from public.map_search_events where profile_id = r.profile_id;
      get diagnostics v_map_search = row_count;
    end if;
    if to_regclass('public.user_daily_activity') is not null then
      delete from public.user_daily_activity where profile_id = r.profile_id;
      get diagnostics v_activity = row_count;
    end if;
    if to_regclass('public.cookie_consent_logs') is not null then
      delete from public.cookie_consent_logs where user_id = r.profile_id;
    end if;
    if to_regclass('public.subscription_payments') is not null then
      delete from public.subscription_payments where profile_id = r.profile_id;
    end if;
    if to_regclass('public.profile_share_codes') is not null then
      delete from public.profile_share_codes where profile_id = r.profile_id;
    end if;

    delete from public.messages where sender_id = r.profile_id;
    delete from public.useful_contact_pairs
    where profile_low = r.profile_id or profile_high = r.profile_id;
    delete from public.chat_members where user_id = r.profile_id;
    delete from public.chats c
    where not exists (select 1 from public.chat_members cm where cm.chat_id = c.id);
    delete from public.posts where author_id = r.profile_id;
    delete from public.locations where user_id = r.profile_id;
    delete from public.profiles where id = r.profile_id;

    v_deleted := v_deleted + 1;
    raise notice 'Deleted profile %, paywall=%, map_search=%, activity=%',
      r.profile_id, v_paywall, v_map_search, v_activity;
  end loop;

  raise notice 'Total profiles deleted: %', v_deleted;

  -- Auth leftover
  delete from public.admin_users
  where auth_user_id in (
    select id from auth.users
    where lower(email) = lower(v_email)
       or id = v_known_auth
  );

  if to_regclass('auth.one_time_tokens') is not null then
    delete from auth.one_time_tokens
    where user_id in (
      select id from auth.users
      where lower(email) = lower(v_email)
         or id = v_known_auth
    );
  end if;

  delete from auth.refresh_tokens
  where user_id in (
    select id::text from auth.users
    where lower(email) = lower(v_email)
       or id = v_known_auth
  );

  delete from auth.sessions
  where user_id in (
    select id from auth.users
    where lower(email) = lower(v_email)
       or id = v_known_auth
  );

  delete from auth.identities
  where user_id in (
        select id from auth.users
        where lower(email) = lower(v_email)
           or id = v_known_auth
      )
     or lower(coalesce(identity_data->>'email', '')) = lower(v_email);

  delete from auth.users
  where lower(email) = lower(v_email)
     or id = v_known_auth;

  raise notice 'Purged auth.users for %', v_email;
end $$;

commit;

-- =============================================================================
-- 3. VERIFY
-- =============================================================================

\echo '=== 3.1 auth.users left ==='
select count(*) as auth_left
from auth.users
where lower(email) = lower('vova1992_92@mail.ru')
   or id = '4d4b48e3-531b-40e7-8097-983aa6058e04'::uuid;

\echo '=== 3.2 identities left ==='
select count(*) as identities_left
from auth.identities
where lower(coalesce(identity_data->>'email', '')) = lower('vova1992_92@mail.ru');

\echo '=== 3.3 profiles linked to email (should be 0) ==='
select count(*) as profiles_by_email
from public.profiles p
where p.auth_user_id in (
  select id from auth.users where lower(email) = lower('vova1992_92@mail.ru')
);

\echo '=== 3.4 orphan vova/вова on map (should be 0) ==='
select count(*) as orphan_vova_visible
from public.profiles p
where p.auth_user_id is null
  and p.deleted_at is null
  and lower(trim(p.full_name)) in ('vova', 'вова')
  and coalesce(p.map_visible, true) = true;

\echo '=== 3.5 active locations for orphan vova (should be 0) ==='
select count(*) as orphan_locations
from public.locations l
join public.profiles p on p.id = l.user_id
where p.auth_user_id is null
  and p.deleted_at is null
  and lower(trim(p.full_name)) in ('vova', 'вова')
  and l.is_active = true;
