-- Hard purge: оставить только 5 auth-пользователей и их profiles.
-- Осиротевшие профили (auth_user_id IS NULL после удаления из Auth) тоже удаляются.
--
-- Self-hosted Timeweb:
--   ssh root@186.246.2.104
--   cd /root/zeip/my-app
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < /root/zeip/my-app/supabase/sql/2026-07-28-purge-profiles-whitelist.sql
--
-- Альтернатива: SQL Editor https://supabase.zeip.ru — вставить файл целиком.

\echo '=== BEFORE ==='
select count(*) as auth_users from auth.users;

with keep(auth_user_id) as (
  values
    ('16b04d52-c72d-4acf-a7ef-3e01c7289402'::uuid),
    ('ac96f9ba-866c-48ab-ab59-022625f346d4'::uuid),
    ('e463bf4c-6e13-42dd-926e-1998842a9f11'::uuid),
    ('8b614fa0-beca-4d94-81e4-b3cc7393f771'::uuid),
    ('d469c17a-4756-45a3-a1a6-0487b7a8a7e0'::uuid)
)
select
  count(*) as total_profiles,
  count(*) filter (where p.auth_user_id in (select auth_user_id from keep)) as keep_profiles,
  count(*) filter (where p.auth_user_id is null) as orphaned,
  count(*) filter (
    where p.auth_user_id is not null
      and p.auth_user_id not in (select auth_user_id from keep)
  ) as stale_auth_link,
  count(*) filter (
    where p.auth_user_id is null
       or p.auth_user_id not in (select auth_user_id from keep)
  ) as to_delete
from public.profiles p;

begin;

create temp table _keep_auth (auth_user_id uuid primary key);

insert into _keep_auth (auth_user_id) values
  ('16b04d52-c72d-4acf-a7ef-3e01c7289402'),
  ('ac96f9ba-866c-48ab-ab59-022625f346d4'),
  ('e463bf4c-6e13-42dd-926e-1998842a9f11'),
  ('8b614fa0-beca-4d94-81e4-b3cc7393f771'),
  ('d469c17a-4756-45a3-a1a6-0487b7a8a7e0');

create temp table _keep_profiles (id uuid primary key);

insert into _keep_profiles (id)
select p.id
from public.profiles p
where p.auth_user_id in (select auth_user_id from _keep_auth);

create temp table _drop_profiles (id uuid primary key);

insert into _drop_profiles (id)
select p.id
from public.profiles p
where p.id not in (select id from _keep_profiles);

\echo 'Profiles to delete:'
select count(*) as drop_count from _drop_profiles;

-- Сообщения удалённых пользователей
delete from public.messages m
where m.sender_id in (select id from _drop_profiles);

-- Полезные контакты (CASCADE при delete profiles, но чистим явно)
delete from public.useful_contact_pairs ucp
where ucp.profile_low in (select id from _drop_profiles)
   or ucp.profile_high in (select id from _drop_profiles);

-- Участники чатов
delete from public.chat_members cm
where cm.user_id in (select id from _drop_profiles);

-- Чаты без участников или только с удалёнными участниками
delete from public.chats c
where not exists (
  select 1 from public.chat_members cm where cm.chat_id = c.id
)
or not exists (
  select 1
  from public.chat_members cm
  where cm.chat_id = c.id
    and cm.user_id not in (select id from _drop_profiles)
);

-- Посты и гео
delete from public.posts po
where po.author_id in (select id from _drop_profiles);

delete from public.locations loc
where loc.user_id in (select id from _drop_profiles);

-- Админы вне whitelist
delete from public.admin_users au
where au.auth_user_id not in (select auth_user_id from _keep_auth);

-- Hard delete профилей (CASCADE: profile_work, profile_private, push_subscriptions,
-- subscription_payments, profile_interest_targets, profile_views, profile_blocks,
-- profile_contacts, post_comments, rating_*, moderation target_profile_id и др.)
delete from public.profiles p
where p.id in (select id from _drop_profiles);

commit;

\echo '=== AFTER ==='
select count(*) as auth_users from auth.users;
select count(*) as profiles from public.profiles;

select id, full_name, auth_user_id, city, map_visible, deleted_at
from public.profiles
order by full_name;

select count(*) as orphan_locations
from public.locations l
join public.profiles p on p.id = l.user_id
where p.auth_user_id is null;
