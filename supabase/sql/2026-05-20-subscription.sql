-- Подписка Pro: флаги в profiles.
-- Self-hosted Timeweb: таблица profiles обычно принадлежит supabase_admin (не postgres).
--
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < /root/zeip/my-app/supabase/sql/2026-05-20-subscription.sql
--
-- Если ошибка «role supabase_admin does not exist», попробуйте postgres с superuser
-- или выполните этот файл в Supabase Studio → SQL Editor.

alter table public.profiles
  add column if not exists is_pro boolean not null default false,
  add column if not exists pro_expires_at timestamptz;

comment on column public.profiles.is_pro is 'Активная подписка Pro';
comment on column public.profiles.pro_expires_at is 'Дата окончания подписки Pro (UTC)';
