-- Аналитика «кто кого ищет»: спрос из профилей + события фильтра карты.
-- Запуск: Supabase SQL Editor (полный скрипт) или deploy-app.sh на VPS.

-- =============================================================================
-- 1. Нормализованный спрос из profiles.interested_in
-- =============================================================================

create table if not exists public.profile_interest_targets (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  seeker_role text not null,
  target_profession text not null,
  city text,
  country text,
  age integer,
  is_pro boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint profile_interest_targets_unique unique (profile_id, target_profession)
);

create index if not exists idx_profile_interest_targets_seeker_role
  on public.profile_interest_targets (seeker_role);

create index if not exists idx_profile_interest_targets_target_profession
  on public.profile_interest_targets (target_profession);

create index if not exists idx_profile_interest_targets_city
  on public.profile_interest_targets (city);

create index if not exists idx_profile_interest_targets_is_pro
  on public.profile_interest_targets (is_pro);

alter table public.profile_interest_targets enable row level security;

drop policy if exists profile_interest_targets_deny_all on public.profile_interest_targets;
create policy profile_interest_targets_deny_all
  on public.profile_interest_targets
  for all
  to anon, authenticated
  using (false)
  with check (false);

create or replace function public.profile_is_active_pro(
  p_is_pro boolean,
  p_pro_expires_at timestamptz
)
returns boolean
language sql
stable
as $$
  select coalesce(p_is_pro, false)
    and (p_pro_expires_at is null or p_pro_expires_at > now());
$$;

create or replace function public.sync_profile_interest_targets_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seeker_role text;
  v_is_pro boolean;
begin
  delete from public.profile_interest_targets
  where profile_id = new.id;

  v_seeker_role := nullif(btrim(new.role_title), '');
  if v_seeker_role is null then
    return new;
  end if;

  if new.interested_in is null or btrim(new.interested_in) = '' then
    return new;
  end if;

  v_is_pro := public.profile_is_active_pro(new.is_pro, new.pro_expires_at);

  insert into public.profile_interest_targets (
    profile_id,
    seeker_role,
    target_profession,
    city,
    country,
    age,
    is_pro,
    updated_at
  )
  select
    new.id,
    v_seeker_role,
    btrim(line),
    nullif(btrim(new.city), ''),
    nullif(btrim(new.country), ''),
    new.age,
    v_is_pro,
    now()
  from unnest(string_to_array(new.interested_in, E'\n')) as line
  where btrim(line) <> ''
  on conflict (profile_id, target_profession) do update set
    seeker_role = excluded.seeker_role,
    city = excluded.city,
    country = excluded.country,
    age = excluded.age,
    is_pro = excluded.is_pro,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_sync_profile_interest_targets on public.profiles;
create trigger trg_sync_profile_interest_targets
  after insert or update of role_title, interested_in, city, country, age, is_pro, pro_expires_at
  on public.profiles
  for each row
  execute function public.sync_profile_interest_targets_from_profile();

insert into public.profile_interest_targets (
  profile_id,
  seeker_role,
  target_profession,
  city,
  country,
  age,
  is_pro,
  updated_at
)
select
  p.id,
  btrim(p.role_title),
  btrim(line),
  nullif(btrim(p.city), ''),
  nullif(btrim(p.country), ''),
  p.age,
  public.profile_is_active_pro(p.is_pro, p.pro_expires_at),
  now()
from public.profiles p
cross join lateral unnest(string_to_array(p.interested_in, E'\n')) as line
where nullif(btrim(p.role_title), '') is not null
  and nullif(btrim(p.interested_in), '') is not null
  and btrim(line) <> ''
on conflict (profile_id, target_profession) do update set
  seeker_role = excluded.seeker_role,
  city = excluded.city,
  country = excluded.country,
  age = excluded.age,
  is_pro = excluded.is_pro,
  updated_at = now();

-- =============================================================================
-- 2. События «Поиск» на карте
-- =============================================================================

create table if not exists public.map_search_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  is_authenticated boolean not null default false,
  seeker_role text,
  target_profession text not null,
  city_context text not null,
  country text,
  age integer,
  is_pro boolean,
  filters_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_map_search_events_created_at
  on public.map_search_events (created_at desc);

create index if not exists idx_map_search_events_target_profession
  on public.map_search_events (target_profession);

create index if not exists idx_map_search_events_city_context
  on public.map_search_events (city_context);

create index if not exists idx_map_search_events_is_authenticated
  on public.map_search_events (is_authenticated);

alter table public.map_search_events enable row level security;

drop policy if exists map_search_events_deny_all on public.map_search_events;
create policy map_search_events_deny_all
  on public.map_search_events
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- =============================================================================
-- 3. RPC для админ-аналитики
-- =============================================================================

create or replace function public.get_profile_demand_matrix(
  p_city text default null,
  p_country text default null,
  p_age_from integer default null,
  p_age_to integer default null,
  p_is_pro boolean default null,
  p_active_from timestamptz default null,
  p_active_to timestamptz default null
)
returns table (
  seeker_role text,
  target_profession text,
  user_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pit.seeker_role,
    pit.target_profession,
    count(distinct pit.profile_id)::bigint as user_count
  from public.profile_interest_targets pit
  inner join public.profiles p on p.id = pit.profile_id
  where (p_city is null or pit.city = p_city)
    and (p_country is null or pit.country = p_country)
    and (p_age_from is null or (pit.age is not null and pit.age >= p_age_from))
    and (p_age_to is null or (pit.age is not null and pit.age <= p_age_to))
    and (p_is_pro is null or pit.is_pro = p_is_pro)
    and (
      p_active_from is null
      or (
        p.last_seen_at is not null
        and p.last_seen_at >= p_active_from
        and (p_active_to is null or p.last_seen_at <= p_active_to)
      )
    )
  group by pit.seeker_role, pit.target_profession
  order by user_count desc, pit.seeker_role, pit.target_profession;
$$;

create or replace function public.get_map_search_matrix(
  p_from timestamptz,
  p_to timestamptz,
  p_city_context text default null,
  p_country text default null,
  p_age_from integer default null,
  p_age_to integer default null,
  p_is_pro boolean default null,
  p_auth_filter text default 'all'
)
returns table (
  seeker_role text,
  target_profession text,
  event_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(mse.seeker_role, '(не указана)') as seeker_role,
    mse.target_profession,
    count(*)::bigint as event_count
  from public.map_search_events mse
  where mse.created_at >= p_from
    and mse.created_at <= p_to
    and (p_city_context is null or mse.city_context = p_city_context)
    and (p_country is null or mse.country = p_country)
    and (p_age_from is null or (mse.age is not null and mse.age >= p_age_from))
    and (p_age_to is null or (mse.age is not null and mse.age <= p_age_to))
    and (p_is_pro is null or mse.is_pro = p_is_pro)
    and (
      p_auth_filter is null
      or p_auth_filter = 'all'
      or (p_auth_filter = 'authed' and mse.is_authenticated = true)
      or (p_auth_filter = 'guest' and mse.is_authenticated = false)
    )
  group by coalesce(mse.seeker_role, '(не указана)'), mse.target_profession
  order by event_count desc, seeker_role, mse.target_profession;
$$;

revoke all on function public.get_profile_demand_matrix(
  text, text, integer, integer, boolean, timestamptz, timestamptz
) from public;

revoke all on function public.get_map_search_matrix(
  timestamptz, timestamptz, text, text, integer, integer, boolean, text
) from public;

grant execute on function public.get_profile_demand_matrix(
  text, text, integer, integer, boolean, timestamptz, timestamptz
) to service_role;

grant execute on function public.get_map_search_matrix(
  timestamptz, timestamptz, text, text, integer, integer, boolean, text
) to service_role;

notify pgrst, 'reload schema';
