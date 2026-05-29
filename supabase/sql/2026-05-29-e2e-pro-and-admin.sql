-- E2E: Pro для test_pro@zeip.ru, админ для test_admin@zeip.ru
-- Self-hosted Timeweb:
--   ssh root@186.246.2.104
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < /root/zeip/my-app/supabase/sql/2026-05-29-e2e-pro-and-admin.sql

begin;

-- Pro-подписка для автотестов (auth uid test_pro@zeip.ru)
update public.profiles
set
  is_pro = true,
  pro_expires_at = null
where auth_user_id = 'b0e040e8-69fa-4a3d-a184-ffe24d6510a4';

-- Админ support+ для автотестов (auth uid test_admin@zeip.ru)
insert into public.admin_users (auth_user_id, role, created_by)
values (
  '08b650fb-6c84-4956-8140-97b4127e2af7',
  'super_admin',
  null
)
on conflict (auth_user_id) do update
set role = excluded.role;

commit;

-- Проверка Pro:
select id, full_name, auth_user_id, is_pro, pro_expires_at
from public.profiles
where auth_user_id = 'b0e040e8-69fa-4a3d-a184-ffe24d6510a4';

-- Проверка админа:
select auth_user_id, role, created_at
from public.admin_users
where auth_user_id = '08b650fb-6c84-4956-8140-97b4127e2af7';
