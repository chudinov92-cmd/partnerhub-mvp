-- Подписка Pro: флаги в profiles.
-- Запуск (self-hosted Timeweb):
--   docker exec -i supabase-db psql -U postgres -d postgres < ~/zeip/my-app/supabase/sql/2026-05-20-subscription.sql

alter table public.profiles
  add column if not exists is_pro boolean not null default false,
  add column if not exists pro_expires_at timestamptz;

comment on column public.profiles.is_pro is 'Активная подписка Pro';
comment on column public.profiles.pro_expires_at is 'Дата окончания подписки Pro (UTC)';
