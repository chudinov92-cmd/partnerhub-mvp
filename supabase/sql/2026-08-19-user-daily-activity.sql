-- DAU / WAU / MAU / retention: одна строка на пользователя в UTC-день.
-- Self-hosted Timeweb:
--   ssh root@186.246.2.104
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < /root/zeip/my-app/supabase/sql/2026-08-19-user-daily-activity.sql

create table if not exists public.user_daily_activity (
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  day         date not null,
  primary key (profile_id, day)
);

create index if not exists idx_uda_day
  on public.user_daily_activity (day desc);

comment on table public.user_daily_activity is
  'Одна строка на пользователя в день (upsert). Основа для DAU/WAU/MAU и retention.';

alter table public.user_daily_activity enable row level security;

drop policy if exists user_daily_activity_deny_all on public.user_daily_activity;
create policy user_daily_activity_deny_all
  on public.user_daily_activity
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- KPI для /admin/analytics (service_role only)
create or replace function public.get_activity_kpis()
returns table (
  dau_yesterday bigint,
  wau_7d bigint,
  mau_30d bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select (timezone('utc', now()))::date as today_utc
  )
  select
    (
      select count(*)::bigint
      from public.user_daily_activity uda, bounds b
      where uda.day = b.today_utc - 1
    ) as dau_yesterday,
    (
      select count(distinct uda.profile_id)::bigint
      from public.user_daily_activity uda, bounds b
      where uda.day between b.today_utc - 6 and b.today_utc
    ) as wau_7d,
    (
      select count(distinct uda.profile_id)::bigint
      from public.user_daily_activity uda, bounds b
      where uda.day between b.today_utc - 29 and b.today_utc
    ) as mau_30d;
$$;

revoke all on function public.get_activity_kpis() from public;
grant execute on function public.get_activity_kpis() to service_role;

comment on function public.get_activity_kpis() is
  'DAU вчера (UTC), WAU 7д и MAU 30д из user_daily_activity. Только service_role.';

-- DAU за последние 30 дней (ручной разбор):
-- SELECT day, count(distinct profile_id) as dau
-- FROM user_daily_activity
-- WHERE day >= (timezone('utc', now()))::date - 30
-- GROUP BY day ORDER BY day;

-- Retention D7: из когорты дня X — сколько вернулись через 7 дней
-- SELECT
--   a.day AS cohort_day,
--   count(distinct a.profile_id) AS cohort_size,
--   count(distinct b.profile_id) AS returned_d7
-- FROM user_daily_activity a
-- LEFT JOIN user_daily_activity b
--   ON b.profile_id = a.profile_id AND b.day = a.day + 7
-- JOIN profiles p ON p.id = a.profile_id
--   AND date_trunc('day', p.created_at)::date = a.day
-- GROUP BY a.day ORDER BY a.day;

notify pgrst, 'reload schema';
