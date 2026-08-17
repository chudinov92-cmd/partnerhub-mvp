-- Onboarding funnel: quiz progress, pioneer slots, email flags

alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists onboarding_step integer not null default 0,
  add column if not exists is_city_pioneer boolean not null default false,
  add column if not exists reminder_sent boolean not null default false,
  add column if not exists expiry_notified boolean not null default false;

comment on column public.profiles.onboarding_completed is
  'true when user finished the onboarding quiz';
comment on column public.profiles.onboarding_step is
  '0..3 current quiz step; 4 = completed marker after finish';
comment on column public.profiles.is_city_pioneer is
  'first 50 registrants in city received 90-day subscription';
comment on column public.profiles.reminder_sent is
  'paywall reminder email already sent (48h+ unpaid)';
comment on column public.profiles.expiry_notified is
  'pioneer expiry reminder sent 7 days before pro_expires_at';

create table if not exists public.city_pioneer_slots (
  city text primary key,
  used_count integer not null default 0,
  max_count integer not null default 50,
  constraint city_pioneer_slots_used_nonneg check (used_count >= 0),
  constraint city_pioneer_slots_max_positive check (max_count > 0)
);

alter table public.city_pioneer_slots enable row level security;

drop policy if exists "city_pioneer_slots_select_authenticated" on public.city_pioneer_slots;
create policy "city_pioneer_slots_select_authenticated"
  on public.city_pioneer_slots
  for select
  to authenticated
  using (true);

-- Pioneer launch cutoff: accounts created before this date skip pioneer claim
-- (existing users forced through quiz but do not consume pioneer slots)

create or replace function public.claim_pioneer_slot(p_city text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promo_enabled constant boolean := false;
  v_profile_id uuid;
  v_created_at timestamptz;
  v_claimed boolean := false;
  v_launch_cutoff constant timestamptz := timestamptz '2026-08-13 00:00:00+00';
begin
  if not v_promo_enabled then
    return false;
  end if;

  select id, created_at
  into v_profile_id, v_created_at
  from public.profiles
  where auth_user_id = auth.uid()
  limit 1;

  if v_profile_id is null then
    return false;
  end if;

  if v_created_at < v_launch_cutoff then
    return false;
  end if;

  if exists (
    select 1 from public.profiles
    where id = v_profile_id and is_city_pioneer = true
  ) then
    return false;
  end if;

  insert into public.city_pioneer_slots (city, used_count, max_count)
  values (p_city, 0, 50)
  on conflict (city) do nothing;

  update public.city_pioneer_slots
  set used_count = used_count + 1
  where city = p_city and used_count < max_count
  returning true into v_claimed;

  if v_claimed then
    update public.profiles
    set
      is_city_pioneer = true,
      is_pro = true,
      pro_expires_at = now() + interval '90 days'
    where id = v_profile_id;
  end if;

  return coalesce(v_claimed, false);
end;
$$;

revoke all on function public.claim_pioneer_slot(text) from public;
grant execute on function public.claim_pioneer_slot(text) to authenticated;

-- pg_cron jobs (run manually if pg_cron extension is enabled):
-- SELECT cron.schedule(
--   'zeip-paywall-reminder-hourly',
--   '30 * * * *',
--   $$SELECT net.http_post(
--     url := 'https://zeip.ru/api/email/paywall-reminder',
--     headers := jsonb_build_object('x-internal-secret', current_setting('app.internal_email_secret', true)),
--     body := '{}'::jsonb
--   )$$
-- );
-- SELECT cron.schedule(
--   'zeip-pioneer-expiry-daily',
--   '0 6 * * *',
--   $$SELECT net.http_post(
--     url := 'https://zeip.ru/api/email/pioneer-expiry',
--     headers := jsonb_build_object('x-internal-secret', current_setting('app.internal_email_secret', true)),
--     body := '{}'::jsonb
--   )$$
-- );
