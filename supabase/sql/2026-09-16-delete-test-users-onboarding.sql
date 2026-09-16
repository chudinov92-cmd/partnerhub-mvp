-- Hard delete двух тестовых аккаунтов для повторной регистрации и онбординга.
-- Шаблон: 2026-09-11-delete-user-d9242af8.sql
-- UUID может быть profile.id ИЛИ auth_user_id ИЛИ auth.users.id.
--
-- НЕ пишет в account_bans. Снимает бан по email, если он уже есть.
-- Чистит auth_otp_sends по email (иначе повторный OTP упрётся в лимит 4/24ч).
--
-- ВАЖНО: paywall_events и map_search_events — ON DELETE SET NULL.
-- Без явного DELETE события останутся в воронке / спросе профессий.
--
-- Supabase SQL Editor (https://supabase.zeip.ru): вставить файл целиком и Run.
--
-- VPS:
--   ssh root@186.246.2.104
--   cd /root/zeip/my-app
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < supabase/sql/2026-09-16-delete-test-users-onboarding.sql

-- =============================================================================
-- 1. DIAGNOSE
-- =============================================================================

select
  p.id as profile_id,
  p.full_name,
  p.auth_user_id,
  p.city,
  p.onboarding_completed,
  p.onboarding_step,
  p.is_pro,
  p.subscription_plan,
  p.map_visible,
  p.deleted_at,
  p.is_city_pioneer,
  u.email,
  u.created_at as auth_created_at
from public.profiles p
left join auth.users u on u.id = p.auth_user_id
where p.id in (
        '7fee96aa-00ce-4203-a22b-7b8133675ab2'::uuid,
        '5a7ae2a6-a2f2-4f61-8c77-3113bda4810a'::uuid
      )
   or p.auth_user_id in (
        '7fee96aa-00ce-4203-a22b-7b8133675ab2'::uuid,
        '5a7ae2a6-a2f2-4f61-8c77-3113bda4810a'::uuid
      );

select id, email, created_at, last_sign_in_at, email_confirmed_at
from auth.users
where id in (
  '7fee96aa-00ce-4203-a22b-7b8133675ab2'::uuid,
  '5a7ae2a6-a2f2-4f61-8c77-3113bda4810a'::uuid
);

select
  u.id as auth_user_id,
  u.email,
  exists (
    select 1 from public.account_bans b
    where b.email_normalized = lower(trim(u.email))
  ) as email_banned,
  (
    select count(*) from public.auth_otp_sends s
    where s.email_normalized = lower(trim(u.email))
  ) as otp_rows
from auth.users u
where u.id in (
        '7fee96aa-00ce-4203-a22b-7b8133675ab2'::uuid,
        '5a7ae2a6-a2f2-4f61-8c77-3113bda4810a'::uuid
      )
   or u.id in (
        select p.auth_user_id
        from public.profiles p
        where p.id in (
          '7fee96aa-00ce-4203-a22b-7b8133675ab2'::uuid,
          '5a7ae2a6-a2f2-4f61-8c77-3113bda4810a'::uuid
        )
      );

select
  (select count(*) from public.user_daily_activity
     where profile_id in (
       select id from public.profiles
       where id in (
             '7fee96aa-00ce-4203-a22b-7b8133675ab2'::uuid,
             '5a7ae2a6-a2f2-4f61-8c77-3113bda4810a'::uuid
           )
          or auth_user_id in (
             '7fee96aa-00ce-4203-a22b-7b8133675ab2'::uuid,
             '5a7ae2a6-a2f2-4f61-8c77-3113bda4810a'::uuid
           )
     )) as daily_activity_rows,
  (select count(*) from public.paywall_events
     where profile_id in (
       select id from public.profiles
       where id in (
             '7fee96aa-00ce-4203-a22b-7b8133675ab2'::uuid,
             '5a7ae2a6-a2f2-4f61-8c77-3113bda4810a'::uuid
           )
          or auth_user_id in (
             '7fee96aa-00ce-4203-a22b-7b8133675ab2'::uuid,
             '5a7ae2a6-a2f2-4f61-8c77-3113bda4810a'::uuid
           )
     )) as paywall_event_rows,
  (select count(*) from public.map_search_events
     where profile_id in (
       select id from public.profiles
       where id in (
             '7fee96aa-00ce-4203-a22b-7b8133675ab2'::uuid,
             '5a7ae2a6-a2f2-4f61-8c77-3113bda4810a'::uuid
           )
          or auth_user_id in (
             '7fee96aa-00ce-4203-a22b-7b8133675ab2'::uuid,
             '5a7ae2a6-a2f2-4f61-8c77-3113bda4810a'::uuid
           )
     )) as map_search_rows,
  (select count(*) from public.subscription_payments
     where profile_id in (
       select id from public.profiles
       where id in (
             '7fee96aa-00ce-4203-a22b-7b8133675ab2'::uuid,
             '5a7ae2a6-a2f2-4f61-8c77-3113bda4810a'::uuid
           )
          or auth_user_id in (
             '7fee96aa-00ce-4203-a22b-7b8133675ab2'::uuid,
             '5a7ae2a6-a2f2-4f61-8c77-3113bda4810a'::uuid
           )
     )) as payment_rows,
  (select count(*) from public.locations
     where user_id in (
       select id from public.profiles
       where id in (
             '7fee96aa-00ce-4203-a22b-7b8133675ab2'::uuid,
             '5a7ae2a6-a2f2-4f61-8c77-3113bda4810a'::uuid
           )
          or auth_user_id in (
             '7fee96aa-00ce-4203-a22b-7b8133675ab2'::uuid,
             '5a7ae2a6-a2f2-4f61-8c77-3113bda4810a'::uuid
           )
     )) as location_rows;

-- =============================================================================
-- 2. PURGE
-- =============================================================================

begin;

do $$
declare
  v_targets uuid[] := array[
    '7fee96aa-00ce-4203-a22b-7b8133675ab2'::uuid,
    '5a7ae2a6-a2f2-4f61-8c77-3113bda4810a'::uuid
  ];
  v_target uuid;
  v_profile_id uuid;
  v_auth_user_id uuid;
  v_city text;
  v_is_pioneer boolean;
  v_email text;
  v_paywall int := 0;
  v_activity int := 0;
  v_map_search int := 0;
  v_otp int := 0;
  v_bans int := 0;
begin
  foreach v_target in array v_targets
  loop
    v_profile_id := null;
    v_auth_user_id := null;
    v_city := null;
    v_is_pioneer := false;
    v_email := null;
    v_paywall := 0;
    v_activity := 0;
    v_map_search := 0;
    v_otp := 0;
    v_bans := 0;

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
        continue;
      end if;
    end if;

    if v_auth_user_id is not null
       and exists (
         select 1 from public.admin_users a where a.auth_user_id = v_auth_user_id
       ) then
      raise exception 'ABORT: % is admin (auth_user_id=%)', v_target, v_auth_user_id;
    end if;

    if v_auth_user_id is not null then
      select u.email into v_email from auth.users u where u.id = v_auth_user_id;
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

      raise notice 'Deleted profile %, paywall_events=%, map_search=%, daily_activity=%',
        v_profile_id, v_paywall, v_map_search, v_activity;
    end if;

    if v_email is not null
       and to_regclass('public.auth_otp_sends') is not null then
      delete from public.auth_otp_sends
      where email_normalized = lower(trim(v_email));
      get diagnostics v_otp = row_count;
      raise notice 'Deleted auth_otp_sends=% for %', v_otp, v_email;
    end if;

    if v_email is not null
       and to_regclass('public.account_bans') is not null then
      delete from public.account_bans
      where email_normalized = lower(trim(v_email));
      get diagnostics v_bans = row_count;
      if v_bans > 0 then
        raise notice 'Removed account_bans=% for % (needed for re-signup)', v_bans, v_email;
      end if;
    end if;

    if v_auth_user_id is not null then
      delete from public.admin_users where auth_user_id = v_auth_user_id;
      if to_regclass('auth.one_time_tokens') is not null then
        delete from auth.one_time_tokens where user_id = v_auth_user_id;
      end if;
      if to_regclass('auth.mfa_factors') is not null then
        delete from auth.mfa_factors where user_id = v_auth_user_id;
      end if;
      if to_regclass('auth.flow_state') is not null then
        delete from auth.flow_state where user_id = v_auth_user_id;
      end if;
      delete from auth.identities where user_id = v_auth_user_id;
      delete from auth.sessions where user_id = v_auth_user_id;
      delete from auth.refresh_tokens where user_id = v_auth_user_id::text;
      delete from auth.users where id = v_auth_user_id;
      raise notice 'Deleted auth user % email=%', v_auth_user_id, v_email;
    end if;
  end loop;
end $$;

commit;

-- =============================================================================
-- 3. VERIFY (все count должны быть 0)
-- =============================================================================

select count(*) as profiles_left
from public.profiles
where id in (
      '7fee96aa-00ce-4203-a22b-7b8133675ab2'::uuid,
      '5a7ae2a6-a2f2-4f61-8c77-3113bda4810a'::uuid
    )
   or auth_user_id in (
      '7fee96aa-00ce-4203-a22b-7b8133675ab2'::uuid,
      '5a7ae2a6-a2f2-4f61-8c77-3113bda4810a'::uuid
    );

select count(*) as auth_left
from auth.users
where id in (
  '7fee96aa-00ce-4203-a22b-7b8133675ab2'::uuid,
  '5a7ae2a6-a2f2-4f61-8c77-3113bda4810a'::uuid
);

select count(*) as paywall_left
from public.paywall_events
where profile_id in (
  '7fee96aa-00ce-4203-a22b-7b8133675ab2'::uuid,
  '5a7ae2a6-a2f2-4f61-8c77-3113bda4810a'::uuid
);

select count(*) as daily_activity_left
from public.user_daily_activity
where profile_id in (
  '7fee96aa-00ce-4203-a22b-7b8133675ab2'::uuid,
  '5a7ae2a6-a2f2-4f61-8c77-3113bda4810a'::uuid
);

select count(*) as locations_left
from public.locations
where user_id in (
  '7fee96aa-00ce-4203-a22b-7b8133675ab2'::uuid,
  '5a7ae2a6-a2f2-4f61-8c77-3113bda4810a'::uuid
);

-- Пересчитать MRR вчера (карточка Revenue), если функция уже накатана
do $$
begin
  if to_regprocedure('public.compute_mrr_snapshot(date)') is not null then
    perform public.compute_mrr_snapshot((timezone('utc', now()))::date - 1);
  end if;
end $$;
