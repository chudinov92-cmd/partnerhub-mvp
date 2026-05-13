-- =============================================================================
-- Аудит RLS для админки Zeip (запуск в Supabase SQL Editor)
-- Связано с middleware /admin/* и API /api/admin/*
-- =============================================================================

-- 1) admin_users — кто является администратором
-- Middleware и клиент должны видеть строку только для своего JWT.
-- Убедитесь, что SELECT разрешён аутентифицированному пользователю на СВОЮ строку:

select tablename, policyname, permissive, roles, cmd, qual::text as using_expr
from pg_policies
where schemaname = 'public' and tablename = 'admin_users';

-- 2) profiles — список в админке /admin/users загружается anon-клиентом в браузере
select policyname, cmd, roles::text, qual::text, with_check::text
from pg_policies
where schemaname = 'public' and tablename = 'profiles'
order by policyname;

-- 3) posts — модерация
select policyname, cmd, roles::text, qual::text, with_check::text
from pg_policies
where schemaname = 'public' and tablename = 'posts'
order by policyname;

-- 4) admin_audit_log
select policyname, cmd, roles::text
from pg_policies
where schemaname = 'public' and tablename = 'admin_audit_log'
order by policyname;

-- =============================================================================
-- Минимальные условия согласованности с кодом приложения:
-- =============================================================================
-- A) Middleware: есть сессия (cookies) И строка admin_users.auth_user_id = auth.uid().
-- B) PATCH /api/admin/users: после getUser + fetchAdminRoleForAuthUser (service_role).
-- C) PATCH|DELETE /api/admin/posts — moderator+ после проверки admin_users.
--
-- Если middleware всегда 403 — добавьте policy SELECT на admin_users:
-- using (auth_user_id = auth.uid()) для authenticated.
