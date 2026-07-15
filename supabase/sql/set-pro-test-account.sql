-- Pro-подписка на 30 дней для указанных аккаунтов (auth_user_id).
-- Self-hosted Timeweb:
--   ssh root@186.246.2.104
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < /root/zeip/my-app/supabase/sql/set-pro-test-account.sql

begin;

update public.profiles
set
  is_pro = true,
  pro_expires_at = now() + interval '30 days'
where auth_user_id in (
  '16b04d52-c72d-4acf-a7ef-3e01c7289402', -- Владимир
  '133da1e0-4755-4c81-9cca-ce85ff1c1925'  -- Данис
);

commit;

-- Проверка:
select id, full_name, auth_user_id, is_pro, pro_expires_at
from public.profiles
where auth_user_id in (
  '16b04d52-c72d-4acf-a7ef-3e01c7289402',
  '133da1e0-4755-4c81-9cca-ce85ff1c1925'
);

-- Сброс в Free:
-- update public.profiles
-- set is_pro = false, pro_expires_at = null
-- where auth_user_id in (
--   '16b04d52-c72d-4acf-a7ef-3e01c7289402',
--   '133da1e0-4755-4c81-9cca-ce85ff1c1925'
-- );
