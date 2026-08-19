-- Ежедневные снапшоты MRR / churn для admin analytics.
-- Self-hosted Timeweb:
--   ssh root@186.246.2.104
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < /root/zeip/my-app/supabase/sql/2026-08-19-mrr-snapshots.sql

create extension if not exists pg_cron;

create table if not exists public.mrr_snapshots (
  snapshot_date   date not null primary key,
  mrr_rub         numeric(12, 2) not null default 0,
  active_pro      integer not null default 0,
  active_pro_plus integer not null default 0,
  new_customers   integer not null default 0,
  renewals        integer not null default 0,
  churned         integer not null default 0,
  created_at      timestamptz not null default now()
);

comment on table public.mrr_snapshots is
  'Ежедневный снапшот MRR и подписочных KPI (UTC). Заполняется pg_cron.';

alter table public.mrr_snapshots enable row level security;

drop policy if exists mrr_snapshots_deny_all on public.mrr_snapshots;
create policy mrr_snapshots_deny_all
  on public.mrr_snapshots
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- Профиль когда-либо платил (trial без платежа не считается)
create or replace function public.profile_has_paid_subscription(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscription_payments sp
    where sp.profile_id = p_profile_id
      and sp.status = 'paid'
  );
$$;

revoke all on function public.profile_has_paid_subscription(uuid) from public;
grant execute on function public.profile_has_paid_subscription(uuid) to service_role;

create or replace function public.compute_mrr_snapshot(p_date date default current_date - 1)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mrr       numeric(12, 2) := 0;
  v_pro       integer := 0;
  v_pro_plus  integer := 0;
  v_new       integer := 0;
  v_renewals  integer := 0;
  v_churned   integer := 0;
  v_day_end   timestamptz := (p_date + 1)::timestamptz;
begin
  -- Активные платные подписки на конец дня (UTC), без trial
  select
    count(*) filter (where p.subscription_plan = 'pro')::integer,
    count(*) filter (where p.subscription_plan = 'pro_plus')::integer
  into v_pro, v_pro_plus
  from public.profiles p
  where p.subscription_plan in ('pro', 'pro_plus')
    and (p.pro_expires_at is null or p.pro_expires_at > v_day_end)
    and public.profile_has_paid_subscription(p.id);

  -- MRR: Pro * 249 + Pro+ * 449 (месячная нормализация)
  v_mrr := (v_pro * 249) + (v_pro_plus * 449);

  -- Платежи за день (UTC)
  select
    count(*) filter (where sp.is_renewal = false)::integer,
    count(*) filter (where sp.is_renewal = true)::integer
  into v_new, v_renewals
  from public.subscription_payments sp
  where sp.status = 'paid'
    and (sp.paid_at at time zone 'utc')::date = p_date;

  -- Отток: pro_expires_at в этот день, срок в прошлом, был paid (не trial)
  select count(*)::integer
  into v_churned
  from public.profiles p
  where (p.pro_expires_at at time zone 'utc')::date = p_date
    and p.pro_expires_at <= now()
    and public.profile_has_paid_subscription(p.id);

  insert into public.mrr_snapshots
    (snapshot_date, mrr_rub, active_pro, active_pro_plus, new_customers, renewals, churned)
  values
    (p_date, v_mrr, v_pro, v_pro_plus, v_new, v_renewals, v_churned)
  on conflict (snapshot_date) do update set
    mrr_rub = excluded.mrr_rub,
    active_pro = excluded.active_pro,
    active_pro_plus = excluded.active_pro_plus,
    new_customers = excluded.new_customers,
    renewals = excluded.renewals,
    churned = excluded.churned;
end;
$$;

revoke all on function public.compute_mrr_snapshot(date) from public;
grant execute on function public.compute_mrr_snapshot(date) to service_role;

comment on function public.compute_mrr_snapshot(date) is
  'Вычисляет и upsert снапшот MRR за дату (UTC). По умолчанию — вчера.';

-- KPI для /admin/analytics Revenue (service_role only)
create or replace function public.get_revenue_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_yesterday date := (timezone('utc', now()))::date - 1;
  v_snapshot public.mrr_snapshots%rowtype;
  v_ltv numeric;
  v_avg_payments numeric;
  v_series jsonb;
begin
  select *
  into v_snapshot
  from public.mrr_snapshots ms
  where ms.snapshot_date = v_yesterday;

  select
    round(avg(t.total_paid), 2),
    round(avg(t.payments_count), 1)
  into v_ltv, v_avg_payments
  from (
    select
      sp.profile_id,
      count(*)::numeric as payments_count,
      sum(sp.out_sum) as total_paid
    from public.subscription_payments sp
    where sp.status = 'paid'
    group by sp.profile_id
  ) t;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'snapshot_date', ms.snapshot_date,
        'mrr_rub', ms.mrr_rub,
        'active_pro', ms.active_pro,
        'active_pro_plus', ms.active_pro_plus,
        'new_customers', ms.new_customers,
        'renewals', ms.renewals,
        'churned', ms.churned
      )
      order by ms.snapshot_date asc
    ),
    '[]'::jsonb
  )
  into v_series
  from (
    select *
    from public.mrr_snapshots
    order by snapshot_date desc
    limit 60
  ) ms;

  return jsonb_build_object(
    'yesterday', jsonb_build_object(
      'snapshot_date', v_yesterday,
      'mrr_rub', coalesce(v_snapshot.mrr_rub, 0),
      'active_pro', coalesce(v_snapshot.active_pro, 0),
      'active_pro_plus', coalesce(v_snapshot.active_pro_plus, 0),
      'new_customers', coalesce(v_snapshot.new_customers, 0),
      'renewals', coalesce(v_snapshot.renewals, 0),
      'churned', coalesce(v_snapshot.churned, 0)
    ),
    'ltv', jsonb_build_object(
      'avg_ltv_rub', coalesce(v_ltv, 0),
      'avg_payments_per_user', coalesce(v_avg_payments, 0)
    ),
    'series', v_series
  );
end;
$$;

revoke all on function public.get_revenue_metrics() from public;
grant execute on function public.get_revenue_metrics() to service_role;

comment on function public.get_revenue_metrics() is
  'MRR-серия (60д), вчерашние KPI и LTV для /admin/analytics. Только service_role.';

-- Первый снапшот сразу (иначе админка пустая до 03:00 UTC)
select public.compute_mrr_snapshot((timezone('utc', now()))::date - 1);

-- pg_cron: ежедневно в 03:00 UTC
select cron.unschedule(jobid)
from cron.job
where jobname = 'zeip-mrr-snapshot-daily';

select cron.schedule(
  'zeip-mrr-snapshot-daily',
  '0 3 * * *',
  $$ select public.compute_mrr_snapshot(); $$
);

-- MRR за последние 60 дней (ручной разбор):
-- SELECT snapshot_date, mrr_rub, active_pro, active_pro_plus,
--        new_customers, renewals, churned
-- FROM mrr_snapshots
-- ORDER BY snapshot_date DESC
-- LIMIT 60;

-- LTV (грубо): средний чек * среднее число платежей на клиента
-- SELECT
--   round(avg(total_paid), 2) AS avg_ltv_rub,
--   round(avg(payments_count), 1) AS avg_payments_per_user
-- FROM (
--   SELECT profile_id,
--     count(*) AS payments_count,
--     sum(out_sum) AS total_paid
--   FROM subscription_payments
--   WHERE status = 'paid'
--   GROUP BY profile_id
-- ) t;

-- Churn rate месяц к месяцу
-- SELECT
--   date_trunc('month', snapshot_date) AS month,
--   sum(churned) AS total_churned,
--   avg(active_pro + active_pro_plus) AS avg_active
-- FROM mrr_snapshots
-- GROUP BY 1 ORDER BY 1;

notify pgrst, 'reload schema';
