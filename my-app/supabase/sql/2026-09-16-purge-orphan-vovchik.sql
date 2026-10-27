-- Hard purge сироты «Вовчик» с карты (auth.users уже нет, auth_user_id IS NULL).
-- След Dashboard Delete: профиль остался map_visible=true.
-- Не трогает живые аккаунты chudinov92@gmail.com и vova1992_92@mail.ru.
--
-- profile.id: fd582634-5983-40f7-992b-7cfa743e9d2b
-- location.id: a161608d-e418-4338-b699-57cccdb16ef9
--
-- Supabase SQL Editor (https://supabase.zeip.ru): вставить файл целиком и Run.
--
-- VPS (после входа, когда уже root@mail:~#):
--   cd /root/zeip/my-app
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < supabase/sql/2026-09-16-purge-orphan-vovchik.sql

-- =============================================================================
-- 1. DIAGNOSE
-- =============================================================================

select
  p.id as profile_id,
  p.full_name,
  p.auth_user_id,
  p.city,
  p.role_title,
  p.map_visible,
  p.deleted_at,
  p.is_city_pioneer,
  p.onboarding_completed,
  p.created_at,
  l.id as location_id,
  l.is_active,
  l.lat,
  l.lng
from public.profiles p
left join public.locations l on l.user_id = p.id
where p.id = 'fd582634-5983-40f7-992b-7cfa743e9d2b'::uuid;

-- Защита: живые аккаунты не должны попасть в этот UUID
select
  p.id,
  p.full_name,
  u.email
from public.profiles p
left join auth.users u on u.id = p.auth_user_id
where p.id = 'fd582634-5983-40f7-992b-7cfa743e9d2b'::uuid
  and (
    p.auth_user_id is not null
    or coalesce(lower(trim(p.full_name)), '') not in ('вовчик')
  );

-- =============================================================================
-- 2. PURGE
-- =============================================================================

begin;

do $$
declare
  v_profile_id uuid := 'fd582634-5983-40f7-992b-7cfa743e9d2b';
  v_full_name text;
  v_auth_user_id uuid;
  v_city text;
  v_is_pioneer boolean := false;
  v_paywall int := 0;
  v_activity int := 0;
  v_map_search int := 0;
begin
  select p.full_name, p.auth_user_id, p.city, coalesce(p.is_city_pioneer, false)
  into v_full_name, v_auth_user_id, v_city, v_is_pioneer
  from public.profiles p
  where p.id = v_profile_id;

  if not found then
    raise notice 'Profile % already gone', v_profile_id;
    return;
  end if;

  if v_auth_user_id is not null then
    raise exception 'ABORT: % is not an orphan (auth_user_id=%)', v_profile_id, v_auth_user_id;
  end if;

  if lower(trim(coalesce(v_full_name, ''))) <> 'вовчик' then
    raise exception 'ABORT: unexpected full_name=% for %', v_full_name, v_profile_id;
  end if;

  if v_is_pioneer and v_city is not null
     and to_regclass('public.city_pioneer_slots') is not null then
    update public.city_pioneer_slots
    set used_count = greatest(0, used_count - 1)
    where city = v_city and used_count > 0;
  end if;

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

  raise notice 'Deleted orphan Вовчик %, paywall=%, map_search=%, activity=%',
    v_profile_id, v_paywall, v_map_search, v_activity;
end $$;

commit;

-- =============================================================================
-- 3. VERIFY (profiles_left и locations_left = 0; живые пины на месте)
-- =============================================================================

select count(*) as profiles_left
from public.profiles
where id = 'fd582634-5983-40f7-992b-7cfa743e9d2b'::uuid;

select count(*) as locations_left
from public.locations
where user_id = 'fd582634-5983-40f7-992b-7cfa743e9d2b'::uuid
   or id = 'a161608d-e418-4338-b699-57cccdb16ef9'::uuid;

select
  p.id,
  p.full_name,
  u.email,
  l.is_active
from public.profiles p
left join auth.users u on u.id = p.auth_user_id
left join public.locations l on l.user_id = p.id and l.is_active = true
where p.id in (
  '60fea46f-ff76-46ff-b00b-3cf65119feb6'::uuid, -- chudinov92@gmail.com
  '05980fd7-4bc2-4978-b978-b9c8e95a4955'::uuid  -- vova1992_92@mail.ru
)
   or p.auth_user_id in (
  '16b04d52-c72d-4acf-a7ef-3e01c7289402'::uuid,
  '827ce259-1869-414c-8ce0-2911a3206022'::uuid
);
