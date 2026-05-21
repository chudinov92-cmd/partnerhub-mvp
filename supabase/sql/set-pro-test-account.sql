-- Перевод тестового аккаунта в Pro на 30 дней.
-- Выполнить на VPS:
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < /root/zeip/my-app/supabase/sql/set-pro-test-account.sql

UPDATE public.profiles
SET
  is_pro = true,
  pro_expires_at = now() + interval '30 days'
WHERE auth_user_id = '16b04d52-c72d-4acf-a7ef-3e01c7289402';

-- Проверка:
SELECT id, full_name, is_pro, pro_expires_at
FROM public.profiles
WHERE auth_user_id = '16b04d52-c72d-4acf-a7ef-3e01c7289402';

-- Сброс в Free:
-- UPDATE public.profiles
-- SET is_pro = false, pro_expires_at = null
-- WHERE auth_user_id = '16b04d52-c72d-4acf-a7ef-3e01c7289402';
