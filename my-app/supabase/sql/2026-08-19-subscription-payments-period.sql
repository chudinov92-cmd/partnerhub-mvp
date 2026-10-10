-- period + is_renewal для subscription_payments (MRR / churn / LTV).
-- Self-hosted Timeweb:
--   ssh root@186.246.2.104
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < /root/zeip/my-app/supabase/sql/2026-08-19-subscription-payments-period.sql

alter table public.subscription_payments
  add column if not exists period text,
  add column if not exists is_renewal boolean not null default false;

alter table public.subscription_payments
  drop constraint if exists subscription_payments_period_check;

alter table public.subscription_payments
  add constraint subscription_payments_period_check
  check (period is null or period in ('monthly', 'yearly'));

comment on column public.subscription_payments.period is
  'Период подписки: monthly | yearly. Извлекается из plan при записи.';
comment on column public.subscription_payments.is_renewal is
  'true = повторная оплата (продление); false = первая покупка.';

-- Бэкфилл period из существующего поля plan
update public.subscription_payments
set period = case
  when plan like '%yearly%' then 'yearly'
  when plan = 'upgrade_pro_to_pro_plus' then 'monthly'
  else 'monthly'
end
where period is null;

-- Бэкфилл is_renewal: был ли более ранний paid у того же profile_id
update public.subscription_payments sp
set is_renewal = true
where sp.status = 'paid'
  and sp.is_renewal = false
  and exists (
    select 1
    from public.subscription_payments prior
    where prior.profile_id = sp.profile_id
      and prior.status = 'paid'
      and prior.id <> sp.id
      and coalesce(prior.paid_at, prior.created_at) < coalesce(sp.paid_at, sp.created_at)
  );

create index if not exists idx_subscription_payments_status_paid_at
  on public.subscription_payments (status, paid_at desc);

notify pgrst, 'reload schema';
