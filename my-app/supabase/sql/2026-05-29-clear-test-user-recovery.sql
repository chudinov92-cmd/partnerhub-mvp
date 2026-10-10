-- Сброс recovery_sent_at для E2E Free-пользователя (test_user@zeip.ru).
-- Нужно, если после TC-1.4 или «Забыли пароль?» тесты уводят на /auth/reset-password.
--
-- VPS:
--   ssh root@186.246.2.104
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < /root/zeip/my-app/supabase/sql/2026-05-29-clear-test-user-recovery.sql

update auth.users
set recovery_sent_at = null
where email = 'test_user@zeip.ru';

select id, email, recovery_sent_at
from auth.users
where email = 'test_user@zeip.ru';
