-- Таблица платежей Robokassa для подписки Pro.
-- Self-hosted Timeweb:
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < /root/zeip/my-app/supabase/sql/2026-07-15-subscription-payments.sql

create table if not exists public.subscription_payments (
  id             bigserial primary key,
  inv_id         bigint unique not null,
  profile_id     uuid not null references public.profiles(id) on delete cascade,
  out_sum        numeric(10, 2) not null,
  plan           text not null default 'pro_monthly',
  status         text not null default 'pending',  -- pending | paid | failed
  created_at     timestamptz not null default now(),
  paid_at        timestamptz
);

comment on table public.subscription_payments is 'Платежи Robokassa: хранит InvId → profile_id для обработки webhook.';

create index if not exists idx_subscription_payments_profile
  on public.subscription_payments (profile_id);

-- RLS: только service_role (backend webhook). Клиент не должен читать/писать.
alter table public.subscription_payments enable row level security;

-- Нет публичных политик — service_role обходит RLS.
