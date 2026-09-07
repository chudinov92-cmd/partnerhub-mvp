-- Диагностика + hard delete по email (после повторной регистрации письмо не уходит).
-- GoTrue: если auth.users с этим email ещё есть, POST /signup отвечает 200 и НЕ шлёт письмо.
--
-- Supabase SQL Editor (https://supabase.zeip.ru): выполнить файл целиком.
--
-- VPS:
--   ssh root@186.246.2.104
--   cd /root/zeip/my-app
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < supabase/sql/2026-08-22-purge-email-vova1992.sql

-- =============================================================================
-- 1. DIAGNOSE
-- =============================================================================

select
  u.id as auth_user_id,
  u.email,
  u.email_confirmed_at,
  u.confirmation_sent_at,
  u.recovery_sent_at,
  u.created_at,
  u.last_sign_in_at
from auth.users u
where lower(u.email) = lower('vova1992_92@mail.ru');

select
  i.id as identity_id,
  i.user_id,
  i.provider,
  i.identity_data->>'email' as identity_email
from auth.identities i
where i.user_id in (
        select id from auth.users where lower(email) = lower('vova1992_92@mail.ru')
      )
   or lower(coalesce(i.identity_data->>'email', '')) = lower('vova1992_92@mail.ru');

select
  p.id as profile_id,
  p.full_name,
  p.auth_user_id,
  p.onboarding_completed,
  p.deleted_at,
  p.created_at
from public.profiles p
where p.auth_user_id in (
  select id from auth.users where lower(email) = lower('vova1992_92@mail.ru')
);

select id, user_id, created_at
from auth.sessions
where user_id in (
  select id from auth.users where lower(email) = lower('vova1992_92@mail.ru')
);

-- =============================================================================
-- 2. PURGE (профиль + auth + метрики). После этого — регистрация заново в инкогнито.
-- =============================================================================

begin;

do $$
declare
  v_email text := 'vova1992_92@mail.ru';
  r record;
  v_paywall int := 0;
  v_activity int := 0;
  v_map_search int := 0;
begin
  for r in
    select p.id as profile_id, p.auth_user_id, p.city, coalesce(p.is_city_pioneer, false) as is_pioneer
    from public.profiles p
    where p.auth_user_id in (
      select u.id from auth.users u where lower(u.email) = lower(v_email)
    )
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

    raise notice 'Deleted profile %, paywall=%, map_search=%, activity=%',
      r.profile_id, v_paywall, v_map_search, v_activity;
  end loop;

  delete from public.admin_users
  where auth_user_id in (
    select id from auth.users where lower(email) = lower(v_email)
  );

  if to_regclass('auth.one_time_tokens') is not null then
    delete from auth.one_time_tokens
    where user_id in (
      select id from auth.users where lower(email) = lower(v_email)
    );
  end if;

  delete from auth.refresh_tokens
  where user_id in (
    select id::text from auth.users where lower(email) = lower(v_email)
  );

  delete from auth.sessions
  where user_id in (
    select id from auth.users where lower(email) = lower(v_email)
  );

  delete from auth.identities
  where user_id in (
        select id from auth.users where lower(email) = lower(v_email)
      )
     or lower(coalesce(identity_data->>'email', '')) = lower(v_email);

  delete from auth.users
  where lower(email) = lower(v_email);

  raise notice 'Purged auth.users for %', v_email;
end $$;

commit;

select count(*) as auth_left
from auth.users
where lower(email) = lower('vova1992_92@mail.ru');

select count(*) as identities_left
from auth.identities
where lower(coalesce(identity_data->>'email', '')) = lower('vova1992_92@mail.ru');

-- =============================================================================
-- 3. Если ПОСЛЕ новой регистрации письмо снова не пришло — подтвердить без письма
--    (раскомментировать и выполнить отдельно). Потом вход с паролем с формы signup.
-- =============================================================================
--
-- update auth.users
-- set
--   email_confirmed_at = coalesce(email_confirmed_at, now()),
--   confirmed_at = coalesce(confirmed_at, now()),
--   confirmation_token = '',
--   confirmation_sent_at = null
-- where lower(email) = lower('vova1992_92@mail.ru');
--
-- select id, email, email_confirmed_at
-- from auth.users
-- where lower(email) = lower('vova1992_92@mail.ru');
