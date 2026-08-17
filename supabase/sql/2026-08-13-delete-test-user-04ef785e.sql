-- Hard delete тестового пользователя (profile.id ИЛИ auth_user_id = 04ef785e-...).
-- Чтобы снова пройти квиз-онбординг: удаляем profile + auth.users (тот же email можно зарегистрировать заново).
--
-- На VPS:
--   cd /root/zeip/my-app
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < supabase/sql/2026-08-13-delete-test-user-04ef785e.sql

\set target_uuid '04ef785e-6092-4cdf-8b25-4c1c495dc402'

\echo '=== FIND (profile.id OR auth_user_id OR auth.users.id) ==='
select
  p.id as profile_id,
  p.full_name,
  p.auth_user_id,
  p.city,
  p.onboarding_completed,
  p.onboarding_step,
  p.is_city_pioneer,
  p.deleted_at,
  u.email
from public.profiles p
left join auth.users u on u.id = p.auth_user_id
where p.id = :'target_uuid'::uuid
   or p.auth_user_id = :'target_uuid'::uuid;

\echo '=== auth.users only (orphan, без profile) ==='
select id, email, created_at
from auth.users
where id = :'target_uuid'::uuid;

begin;

do $$
declare
  v_target uuid := '04ef785e-6092-4cdf-8b25-4c1c495dc402';
  v_profile_id uuid;
  v_auth_user_id uuid;
  v_city text;
  v_is_pioneer boolean;
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

  if v_is_pioneer and v_city is not null then
    update public.city_pioneer_slots
    set used_count = greatest(0, used_count - 1)
    where city = v_city and used_count > 0;
  end if;

  if v_profile_id is not null then
    delete from public.messages where sender_id = v_profile_id;
    delete from public.useful_contact_pairs
    where profile_low = v_profile_id or profile_high = v_profile_id;
    delete from public.chat_members where user_id = v_profile_id;
    delete from public.chats c
    where not exists (select 1 from public.chat_members cm where cm.chat_id = c.id);
    delete from public.posts where author_id = v_profile_id;
    delete from public.locations where user_id = v_profile_id;
    delete from public.profiles where id = v_profile_id;
    raise notice 'Deleted profile %', v_profile_id;
  end if;

  if v_auth_user_id is null then
    select auth_user_id into v_auth_user_id
    from public.profiles where id = v_target;
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

\echo '=== AFTER ==='
select count(*) as profiles_left
from public.profiles
where id = :'target_uuid'::uuid or auth_user_id = :'target_uuid'::uuid;

select count(*) as auth_left from auth.users where id = :'target_uuid'::uuid;
