-- Hard delete тестового пользователя для повторного прогона метрик.
-- Цель: убрать profile + auth.users + события аналитики (DAU, paywall, map search).
-- UUID может быть profile.id ИЛИ auth_user_id ИЛИ auth.users.id.
--
-- ВАЖНО: paywall_events и map_search_events — ON DELETE SET NULL.
-- Без явного DELETE события останутся в воронке / спросе профессий.
-- user_daily_activity — ON DELETE CASCADE, чистим явно для отчёта.
--
-- Supabase SQL Editor (https://supabase.zeip.ru): вставить файл целиком и Run.
--
-- VPS:
--   ssh root@186.246.2.104
--   cd /root/zeip/my-app
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < supabase/sql/2026-08-22-delete-test-user-a02b5392.sql

select
  p.id as profile_id,
  p.full_name,
  p.auth_user_id,
  p.city,
  p.onboarding_completed,
  p.onboarding_step,
  p.is_pro,
  p.subscription_plan,
  p.deleted_at,
  u.email,
  u.created_at as auth_created_at
from public.profiles p
left join auth.users u on u.id = p.auth_user_id
where p.id = 'a02b5392-7714-4464-b5e1-1504a023cc57'::uuid
   or p.auth_user_id = 'a02b5392-7714-4464-b5e1-1504a023cc57'::uuid;

select id, email, created_at
from auth.users
where id = 'a02b5392-7714-4464-b5e1-1504a023cc57'::uuid;

select
  (select count(*) from public.user_daily_activity
     where profile_id in (
       select id from public.profiles
       where id = 'a02b5392-7714-4464-b5e1-1504a023cc57'::uuid
          or auth_user_id = 'a02b5392-7714-4464-b5e1-1504a023cc57'::uuid
     )) as daily_activity_rows,
  (select count(*) from public.paywall_events
     where profile_id in (
       select id from public.profiles
       where id = 'a02b5392-7714-4464-b5e1-1504a023cc57'::uuid
          or auth_user_id = 'a02b5392-7714-4464-b5e1-1504a023cc57'::uuid
     )) as paywall_event_rows,
  (select count(*) from public.map_search_events
     where profile_id in (
       select id from public.profiles
       where id = 'a02b5392-7714-4464-b5e1-1504a023cc57'::uuid
          or auth_user_id = 'a02b5392-7714-4464-b5e1-1504a023cc57'::uuid
     )) as map_search_rows,
  (select count(*) from public.subscription_payments
     where profile_id in (
       select id from public.profiles
       where id = 'a02b5392-7714-4464-b5e1-1504a023cc57'::uuid
          or auth_user_id = 'a02b5392-7714-4464-b5e1-1504a023cc57'::uuid
     )) as payment_rows;

begin;

do $$
declare
  v_target uuid := 'a02b5392-7714-4464-b5e1-1504a023cc57';
  v_profile_id uuid;
  v_auth_user_id uuid;
  v_city text;
  v_is_pioneer boolean;
  v_paywall int := 0;
  v_activity int := 0;
  v_map_search int := 0;
begin
  select p.id, p.auth_user_id, p.city, coalesce(p.is_city_pioneer, false)
  into v_profile_id, v_auth_user_id, v_city, v_is_pioneer
  from public.profiles p
  where p.id = v_target or p.auth_user_id = v_target
  limit 1;

  if v_profile_id is null then
    if exists (select 1 from auth.users where id = v_target) then
      v_auth_user_id := v_target;
      raise notice 'Profile not found; will delete auth user % only', v_auth_user_id;
    else
      raise notice 'Nothing found for %', v_target;
      return;
    end if;
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
    delete from public.messages where sender_id = v_profile_id;
    delete from public.useful_contact_pairs
    where profile_low = v_profile_id or profile_high = v_profile_id;
    delete from public.chat_members where user_id = v_profile_id;
    delete from public.chats c
    where not exists (select 1 from public.chat_members cm where cm.chat_id = c.id);
    delete from public.posts where author_id = v_profile_id;
    delete from public.locations where user_id = v_profile_id;
    delete from public.profiles where id = v_profile_id;

    raise notice 'Deleted profile %, paywall_events=%, map_search=%, daily_activity=%',
      v_profile_id, v_paywall, v_map_search, v_activity;
  end if;

  if v_auth_user_id is not null then
    delete from public.admin_users where auth_user_id = v_auth_user_id;
    delete from auth.identities where user_id = v_auth_user_id;
    delete from auth.sessions where user_id = v_auth_user_id;
    delete from auth.refresh_tokens where user_id = v_auth_user_id::text;
    delete from auth.users where id = v_auth_user_id;
    raise notice 'Deleted auth user %', v_auth_user_id;
  end if;
end $$;

commit;

select count(*) as profiles_left
from public.profiles
where id = 'a02b5392-7714-4464-b5e1-1504a023cc57'::uuid
   or auth_user_id = 'a02b5392-7714-4464-b5e1-1504a023cc57'::uuid;

select count(*) as auth_left
from auth.users
where id = 'a02b5392-7714-4464-b5e1-1504a023cc57'::uuid;

select count(*) as paywall_left
from public.paywall_events
where profile_id = 'a02b5392-7714-4464-b5e1-1504a023cc57'::uuid;

select count(*) as daily_activity_left
from public.user_daily_activity
where profile_id = 'a02b5392-7714-4464-b5e1-1504a023cc57'::uuid;

-- Пересчитать MRR вчера (карточка Revenue), если функция уже накатана
do $$
begin
  if to_regprocedure('public.compute_mrr_snapshot(date)') is not null then
    perform public.compute_mrr_snapshot((timezone('utc', now()))::date - 1);
  end if;
end $$;
