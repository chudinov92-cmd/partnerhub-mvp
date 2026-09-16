-- Пионерская акция: тумблер в БД (админка), 90 дней Pro+, лимит Перми 100.
-- Kill switch больше не в константе claim_pioneer_slot и не в NEXT_PUBLIC_*.
--
-- Self-hosted Timeweb:
--   ssh root@186.246.2.104
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < /root/zeip/my-app/supabase/sql/2026-09-16-pioneer-promo-admin.sql

-- ---------------------------------------------------------------------------
-- Singleton: акция вкл/выкл
-- ---------------------------------------------------------------------------

create table if not exists public.pioneer_promo_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

comment on table public.pioneer_promo_settings is
  'Синглтон: пионерская акция (первые в городе → 90 дней Pro+). Вкл/выкл из /admin/promo.';
comment on column public.pioneer_promo_settings.enabled is
  'true = квиз выдаёт слот Pro+; false = слот не выдаётся.';

insert into public.pioneer_promo_settings (id, enabled)
values (true, false)
on conflict (id) do nothing;

alter table public.pioneer_promo_settings enable row level security;

drop policy if exists pioneer_promo_settings_select_authenticated
  on public.pioneer_promo_settings;
create policy pioneer_promo_settings_select_authenticated
  on public.pioneer_promo_settings
  for select
  to authenticated
  using (true);

drop policy if exists pioneer_promo_settings_update_super_admin
  on public.pioneer_promo_settings;
create policy pioneer_promo_settings_update_super_admin
  on public.pioneer_promo_settings
  for update
  to authenticated
  using (public.is_super_admin_auth())
  with check (public.is_super_admin_auth());

grant select, update on public.pioneer_promo_settings to authenticated;

create or replace function public.touch_pioneer_promo_settings()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_touch_pioneer_promo_settings
  on public.pioneer_promo_settings;
create trigger trg_touch_pioneer_promo_settings
  before update on public.pioneer_promo_settings
  for each row
  execute function public.touch_pioneer_promo_settings();

-- ---------------------------------------------------------------------------
-- Лимит Перми: 100 (used_count не сбрасываем)
-- ---------------------------------------------------------------------------

insert into public.city_pioneer_slots (city, used_count, max_count)
values ('Пермь', 0, 100)
on conflict (city) do update
set max_count = 100;

drop policy if exists city_pioneer_slots_update_super_admin
  on public.city_pioneer_slots;
create policy city_pioneer_slots_update_super_admin
  on public.city_pioneer_slots
  for update
  to authenticated
  using (public.is_super_admin_auth())
  with check (public.is_super_admin_auth());

drop policy if exists city_pioneer_slots_insert_super_admin
  on public.city_pioneer_slots;
create policy city_pioneer_slots_insert_super_admin
  on public.city_pioneer_slots
  for insert
  to authenticated
  with check (public.is_super_admin_auth());

grant select, insert, update on public.city_pioneer_slots to authenticated;

-- ---------------------------------------------------------------------------
-- claim_pioneer_slot: флаг из БД, Pro+ на 90 дней, Пермь 100 / остальные 50
-- ---------------------------------------------------------------------------

create or replace function public.claim_pioneer_slot(p_city text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promo_enabled boolean := false;
  v_profile_id uuid;
  v_created_at timestamptz;
  v_claimed boolean := false;
  v_launch_cutoff constant timestamptz := timestamptz '2026-08-13 00:00:00+00';
  v_max integer;
begin
  select coalesce(s.enabled, false)
    into v_promo_enabled
  from public.pioneer_promo_settings s
  where s.id = true
  limit 1;

  if not coalesce(v_promo_enabled, false) then
    return false;
  end if;

  if p_city is null or btrim(p_city) = '' then
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

  v_max := case when btrim(p_city) = 'Пермь' then 100 else 50 end;

  insert into public.city_pioneer_slots (city, used_count, max_count)
  values (btrim(p_city), 0, v_max)
  on conflict (city) do nothing;

  update public.city_pioneer_slots
  set used_count = used_count + 1
  where city = btrim(p_city) and used_count < max_count
  returning true into v_claimed;

  if v_claimed then
    update public.profiles
    set
      is_city_pioneer = true,
      subscription_plan = 'pro_plus',
      pro_expires_at = now() + interval '90 days'
    where id = v_profile_id;
  end if;

  return coalesce(v_claimed, false);
end;
$$;

revoke all on function public.claim_pioneer_slot(text) from public;
grant execute on function public.claim_pioneer_slot(text) to authenticated;

select
  (select enabled from public.pioneer_promo_settings where id = true) as promo_enabled,
  (select max_count from public.city_pioneer_slots where city = 'Пермь') as perm_max,
  (select proname from pg_proc where proname = 'claim_pioneer_slot' limit 1) as fn;
