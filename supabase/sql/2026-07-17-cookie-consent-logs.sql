-- Логи согласия на использование Cookie (гости и привязка к профилю после авторизации).
-- Self-hosted Timeweb:
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < /root/zeip/my-app/supabase/sql/2026-07-17-cookie-consent-logs.sql

create table if not exists public.cookie_consent_logs (
  id             bigserial primary key,
  anonymous_uid  uuid not null,
  user_id        uuid references public.profiles(id) on delete set null,
  consent_date   timestamptz not null default now(),
  policy_version text not null,
  consent_type   text not null,
  ip_address     text,
  user_agent     text
);

comment on table public.cookie_consent_logs is 'Логи согласия с Cookie-политикой: anonymous_uid гостя, опционально user_id после регистрации.';

create index if not exists idx_ccl_anonymous_uid
  on public.cookie_consent_logs (anonymous_uid);

create index if not exists idx_ccl_user_id
  on public.cookie_consent_logs (user_id);

alter table public.cookie_consent_logs enable row level security;

-- Нет публичных политик — service_role обходит RLS.
