-- Paywall funnel: internal analytics (shown → dismissed/cta_buy → trial/payment).
-- Self-hosted Timeweb:
--   ssh root@186.246.2.104
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < /root/zeip/my-app/supabase/sql/2026-08-19-paywall-events.sql

create table if not exists public.paywall_events (
  id                  bigserial primary key,
  profile_id          uuid references public.profiles(id) on delete set null,
  event_type          text not null,
  intent              text,
  plan                text,
  period              text,
  city                text,
  subscription_plan   text,
  created_at          timestamptz not null default now(),
  constraint paywall_events_event_type_check
    check (event_type in (
      'shown', 'dismissed', 'cta_buy',
      'trial_start', 'checkout_started', 'payment_success'
    ))
);

create index if not exists idx_paywall_events_created_at
  on public.paywall_events (created_at desc);
create index if not exists idx_paywall_events_event_type
  on public.paywall_events (event_type);
create index if not exists idx_paywall_events_profile_id
  on public.paywall_events (profile_id);

comment on table public.paywall_events is
  'Воронка пейвола: shown → dismissed/cta_buy → trial_start/payment_success';

alter table public.paywall_events enable row level security;

drop policy if exists paywall_events_deny_all on public.paywall_events;
create policy paywall_events_deny_all
  on public.paywall_events
  for all
  to anon, authenticated
  using (false)
  with check (false);

create or replace function public.get_paywall_funnel(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with filtered as (
    select event_type, profile_id, intent
    from public.paywall_events
    where created_at >= p_from and created_at <= p_to
  ),
  steps as (
    select event_type,
           count(*)::bigint as cnt,
           count(distinct profile_id)::bigint as unique_users
    from filtered
    group by event_type
  ),
  conv as (
    select
      round(
        100.0 * count(*) filter (where event_type = 'cta_buy')
               / nullif(count(*) filter (where event_type = 'shown'), 0),
        1
      ) as shown_to_cta_pct,
      round(
        100.0 * count(*) filter (where event_type = 'payment_success')
               / nullif(count(*) filter (where event_type = 'shown'), 0),
        1
      ) as shown_to_paid_pct
    from filtered
  ),
  intents as (
    select coalesce(intent, '(empty)') as intent,
           count(*)::bigint as shown_cnt
    from filtered
    where event_type = 'shown'
    group by 1
    order by shown_cnt desc
  )
  select jsonb_build_object(
    'steps', coalesce((select jsonb_agg(to_jsonb(s) order by s.cnt desc) from steps s), '[]'::jsonb),
    'shown_to_cta_pct', (select shown_to_cta_pct from conv),
    'shown_to_paid_pct', (select shown_to_paid_pct from conv),
    'intents', coalesce((select jsonb_agg(to_jsonb(i)) from intents i), '[]'::jsonb)
  );
$$;

revoke all on function public.get_paywall_funnel(timestamptz, timestamptz) from public;
grant execute on function public.get_paywall_funnel(timestamptz, timestamptz) to service_role;

comment on function public.get_paywall_funnel(timestamptz, timestamptz) is
  'Воронка пейвола за период: шаги, конверсии, intent. Только service_role.';

-- Ручной разбор (последние 30 дней):
--
-- Воронка за период:
-- SELECT event_type, count(*) AS cnt,
--   count(distinct profile_id) AS unique_users
-- FROM paywall_events
-- WHERE created_at >= now() - interval '30 days'
-- GROUP BY event_type
-- ORDER BY cnt DESC;
--
-- Конверсия shown → cta_buy / payment_success:
-- SELECT
--   round(
--     100.0 * count(*) FILTER (WHERE event_type = 'cta_buy')
--            / nullif(count(*) FILTER (WHERE event_type = 'shown'), 0),
--     1
--   ) AS shown_to_cta_pct,
--   round(
--     100.0 * count(*) FILTER (WHERE event_type = 'payment_success')
--            / nullif(count(*) FILTER (WHERE event_type = 'shown'), 0),
--     1
--   ) AS shown_to_paid_pct
-- FROM paywall_events
-- WHERE created_at >= now() - interval '30 days';
--
-- Какой intent чаще триггерит пейвол:
-- SELECT intent, count(*) AS shown_cnt
-- FROM paywall_events
-- WHERE event_type = 'shown'
--   AND created_at >= now() - interval '30 days'
-- GROUP BY intent ORDER BY shown_cnt DESC;

notify pgrst, 'reload schema';
