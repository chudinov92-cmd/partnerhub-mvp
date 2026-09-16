-- Performance: map viewport RPCs, chat last-message, indexes.
-- Запуск: Supabase SQL Editor (весь файл целиком).
-- Папка в репо: my-app/supabase/sql/

-- =============================================================================
-- Indexes
-- =============================================================================

create index if not exists idx_locations_active_lat_lng
  on public.locations (lat, lng)
  where is_active = true;

create index if not exists idx_locations_active_user_id
  on public.locations (user_id)
  where is_active = true;

create index if not exists idx_profiles_map_visible_alive
  on public.profiles (id)
  where deleted_at is null and map_visible = true;

create index if not exists idx_posts_author_created_at
  on public.posts (author_id, created_at desc);

create index if not exists idx_messages_chat_sender_created
  on public.messages (chat_id, sender_id, created_at desc);

create index if not exists idx_messages_created_at
  on public.messages (created_at desc);

create index if not exists idx_profile_views_viewer_opened
  on public.profile_views (viewer_id, last_opened_at desc);

-- =============================================================================
-- Helpers
-- =============================================================================

create or replace function public.profile_effective_plan_rank(
  p_is_pro boolean,
  p_pro_expires_at timestamptz,
  p_subscription_plan text
)
returns int
language sql
stable
as $$
  select case
    when coalesce(p_is_pro, false)
      and (p_pro_expires_at is null or p_pro_expires_at > now()) then
      case
        when p_subscription_plan = 'pro_plus' then 3
        when p_subscription_plan = 'pro' then 2
        else 2
      end
    else 1
  end;
$$;

create or replace function public.profile_interested_in_exact(
  p_interested_in text,
  p_target text
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from unnest(string_to_array(coalesce(p_interested_in, ''), E'\n')) as line
    where btrim(line) = btrim(p_target)
      and btrim(line) <> ''
  );
$$;

create or replace function public.profile_matches_map_profession(
  p_profile_id uuid,
  p_role_title text,
  p_profession text
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select
    btrim(coalesce(p_profession, '')) <> ''
    and (
      btrim(coalesce(p_role_title, '')) = btrim(p_profession)
      or exists (
        select 1
        from public.profile_work pw
        where pw.profile_id = p_profile_id
          and btrim(coalesce(pw.role_title, '')) = btrim(p_profession)
      )
    );
$$;

-- =============================================================================
-- Grid clusters (zoom < 9)
-- =============================================================================

create or replace function public.fetch_map_grid_clusters(
  p_min_lat double precision,
  p_max_lat double precision,
  p_min_lng double precision,
  p_max_lng double precision,
  p_zoom int,
  p_profession text default null,
  p_industry text default null,
  p_subindustry text default null,
  p_current_status text default null,
  p_age_from int default null,
  p_age_to int default null,
  p_online_after timestamptz default null,
  p_seeking text[] default null,
  p_interested_in_role text default null,
  p_contact_ids uuid[] default null,
  p_city text default null
)
returns table (
  cell_lat double precision,
  cell_lng double precision,
  point_count bigint,
  has_pro boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  with params as (
    select greatest(1, least(12, coalesce(p_zoom, 3))) as z
  ),
  cell as (
    select case
      when (select z from params) <= 4 then 2.0
      when (select z from params) <= 6 then 0.5
      when (select z from params) <= 8 then 0.1
      else 0.05
    end as step
  ),
  base as (
    select
      l.lat,
      l.lng,
      public.profile_effective_plan_rank(p.is_pro, p.pro_expires_at, p.subscription_plan) as plan_rank
    from public.locations l
    join public.profiles p on p.id = l.user_id
    where l.is_active = true
      and l.lat between p_min_lat and p_max_lat
      and l.lng between p_min_lng and p_max_lng
      and p.deleted_at is null
      and p.map_visible = true
      and (p_profession is null or public.profile_matches_map_profession(p.id, p.role_title, p_profession))
      and (p_industry is null or p.industry is not distinct from p_industry)
      and (p_subindustry is null or p.subindustry is not distinct from p_subindustry)
      and (p_current_status is null or p.current_status is not distinct from p_current_status)
      and (p_age_from is null or (p.age is not null and p.age >= p_age_from))
      and (p_age_to is null or (p.age is not null and p.age <= p_age_to))
      and (p_online_after is null or (p.last_seen_at is not null and p.last_seen_at >= p_online_after))
      and (p_seeking is null or cardinality(p_seeking) = 0 or p.seeking && p_seeking)
      and (
        p_interested_in_role is null
        or public.profile_interested_in_exact(p.interested_in, p_interested_in_role)
      )
      and (p_contact_ids is null or cardinality(p_contact_ids) = 0 or p.id = any (p_contact_ids))
      and (p_city is null or p.city is not distinct from p_city)
  )
  select
    (round((b.lat / c.step)::numeric) * c.step)::double precision as cell_lat,
    (round((b.lng / c.step)::numeric) * c.step)::double precision as cell_lng,
    count(*)::bigint as point_count,
    bool_or(b.plan_rank >= 2) as has_pro
  from base b
  cross join cell c
  group by 1, 2
  order by point_count desc
  limit 500;
$$;

grant execute on function public.fetch_map_grid_clusters(
  double precision, double precision, double precision, double precision, int,
  text, text, text, text, int, int, timestamptz, text[], text, uuid[], text
) to anon, authenticated;

-- =============================================================================
-- Light points for client-side clustering (zoom 9–12)
-- =============================================================================

create or replace function public.fetch_map_viewport_points_light(
  p_min_lat double precision,
  p_max_lat double precision,
  p_min_lng double precision,
  p_max_lng double precision,
  p_limit int default 5000,
  p_profession text default null,
  p_industry text default null,
  p_subindustry text default null,
  p_current_status text default null,
  p_age_from int default null,
  p_age_to int default null,
  p_online_after timestamptz default null,
  p_seeking text[] default null,
  p_interested_in_role text default null,
  p_contact_ids uuid[] default null,
  p_city text default null
)
returns table (
  profile_id uuid,
  lat double precision,
  lng double precision,
  subscription_plan text,
  rating_count int,
  plan_rank int
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.id as profile_id,
    l.lat,
    l.lng,
    coalesce(p.subscription_plan, 'free') as subscription_plan,
    coalesce(p.rating_count, 0) as rating_count,
    public.profile_effective_plan_rank(p.is_pro, p.pro_expires_at, p.subscription_plan) as plan_rank
  from public.locations l
  join public.profiles p on p.id = l.user_id
  where l.is_active = true
    and l.lat between p_min_lat and p_max_lat
    and l.lng between p_min_lng and p_max_lng
    and p.deleted_at is null
    and p.map_visible = true
    and (p_profession is null or public.profile_matches_map_profession(p.id, p.role_title, p_profession))
    and (p_industry is null or p.industry is not distinct from p_industry)
    and (p_subindustry is null or p.subindustry is not distinct from p_subindustry)
    and (p_current_status is null or p.current_status is not distinct from p_current_status)
    and (p_age_from is null or (p.age is not null and p.age >= p_age_from))
    and (p_age_to is null or (p.age is not null and p.age <= p_age_to))
    and (p_online_after is null or (p.last_seen_at is not null and p.last_seen_at >= p_online_after))
    and (p_seeking is null or cardinality(p_seeking) = 0 or p.seeking && p_seeking)
    and (
      p_interested_in_role is null
      or public.profile_interested_in_exact(p.interested_in, p_interested_in_role)
    )
    and (p_contact_ids is null or cardinality(p_contact_ids) = 0 or p.id = any (p_contact_ids))
    and (p_city is null or p.city is not distinct from p_city)
  order by plan_rank desc, rating_count desc, p.id
  limit greatest(1, least(coalesce(p_limit, 5000), 5000));
$$;

grant execute on function public.fetch_map_viewport_points_light(
  double precision, double precision, double precision, double precision, int,
  text, text, text, text, int, int, timestamptz, text[], text, uuid[], text
) to anon, authenticated;

-- =============================================================================
-- Full profiles for HTML pins (street zoom / breakout)
-- =============================================================================

create or replace function public.fetch_map_viewport_pins(
  p_min_lat double precision,
  p_max_lat double precision,
  p_min_lng double precision,
  p_max_lng double precision,
  p_limit int default 200,
  p_own uuid default null,
  p_focused uuid default null,
  p_paid_only boolean default false,
  p_profession text default null,
  p_industry text default null,
  p_subindustry text default null,
  p_current_status text default null,
  p_age_from int default null,
  p_age_to int default null,
  p_online_after timestamptz default null,
  p_seeking text[] default null,
  p_interested_in_role text default null,
  p_contact_ids uuid[] default null,
  p_city text default null
)
returns table (
  location_id uuid,
  user_id uuid,
  lat double precision,
  lng double precision,
  city text,
  profile jsonb
)
language sql
stable
security invoker
set search_path = public
as $$
  with filtered as (
    select
      l.id as location_id,
      l.user_id,
      l.lat,
      l.lng,
      l.city as location_city,
      p.id,
      p.full_name,
      p.age,
      p.city as profile_city,
      p.industry,
      p.subindustry,
      p.role_title,
      p.last_seen_at,
      p.content_updated_at,
      p.skills,
      p.resources,
      p.current_status,
      p.experience_years,
      p.interested_in,
      p.seeking,
      p.rating_avg,
      p.rating_count,
      p.is_pro,
      p.pro_expires_at,
      p.subscription_plan,
      public.profile_effective_plan_rank(p.is_pro, p.pro_expires_at, p.subscription_plan) as plan_rank,
      (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'id', pw.id,
            'role_title', pw.role_title,
            'industry', pw.industry,
            'subindustry', pw.subindustry,
            'experience_years', pw.experience_years,
            'sort_order', pw.sort_order
          )
          order by pw.sort_order nulls last, pw.id
        ), '[]'::jsonb)
        from public.profile_work pw
        where pw.profile_id = p.id
      ) as work_blocks
    from public.locations l
    join public.profiles p on p.id = l.user_id
    where l.is_active = true
      and l.lat between p_min_lat and p_max_lat
      and l.lng between p_min_lng and p_max_lng
      and p.deleted_at is null
      and p.map_visible = true
      and (p_profession is null or public.profile_matches_map_profession(p.id, p.role_title, p_profession))
      and (p_industry is null or p.industry is not distinct from p_industry)
      and (p_subindustry is null or p.subindustry is not distinct from p_subindustry)
      and (p_current_status is null or p.current_status is not distinct from p_current_status)
      and (p_age_from is null or (p.age is not null and p.age >= p_age_from))
      and (p_age_to is null or (p.age is not null and p.age <= p_age_to))
      and (p_online_after is null or (p.last_seen_at is not null and p.last_seen_at >= p_online_after))
      and (p_seeking is null or cardinality(p_seeking) = 0 or p.seeking && p_seeking)
      and (
        p_interested_in_role is null
        or public.profile_interested_in_exact(p.interested_in, p_interested_in_role)
      )
      and (p_contact_ids is null or cardinality(p_contact_ids) = 0 or p.id = any (p_contact_ids))
      and (p_city is null or p.city is not distinct from p_city)
      and (
        not coalesce(p_paid_only, false)
        or public.profile_effective_plan_rank(p.is_pro, p.pro_expires_at, p.subscription_plan) >= 2
      )
  ),
  ranked as (
    select
      f.*,
      row_number() over (
        order by
          case when p_own is not null and f.user_id = p_own then 0 else 1 end,
          case when p_focused is not null and f.user_id = p_focused then 0 else 1 end,
          f.plan_rank desc,
          coalesce(f.rating_count, 0) desc,
          f.user_id
      ) as rn
    from filtered f
  )
  select
    r.location_id,
    r.user_id,
    r.lat,
    r.lng,
    r.location_city as city,
    jsonb_build_object(
      'id', r.id,
      'full_name', r.full_name,
      'age', r.age,
      'city', r.profile_city,
      'industry', r.industry,
      'subindustry', r.subindustry,
      'role_title', r.role_title,
      'last_seen_at', r.last_seen_at,
      'content_updated_at', r.content_updated_at,
      'skills', r.skills,
      'resources', r.resources,
      'current_status', r.current_status,
      'experience_years', r.experience_years,
      'interested_in', r.interested_in,
      'seeking', r.seeking,
      'rating_avg', r.rating_avg,
      'rating_count', r.rating_count,
      'is_pro', r.is_pro,
      'pro_expires_at', r.pro_expires_at,
      'subscription_plan', r.subscription_plan,
      'work_blocks', r.work_blocks
    ) as profile
  from ranked r
  where r.rn <= greatest(1, least(coalesce(p_limit, 200), 200))
     or (p_own is not null and r.user_id = p_own)
     or (p_focused is not null and r.user_id = p_focused)
  order by r.rn;
$$;

grant execute on function public.fetch_map_viewport_pins(
  double precision, double precision, double precision, double precision, int,
  uuid, uuid, boolean,
  text, text, text, text, int, int, timestamptz, text[], text, uuid[], text
) to anon, authenticated;

-- Recommended contacts (replaces ILIKE scan)
create or replace function public.fetch_map_profiles_interested_in(
  p_role text,
  p_min_lat double precision,
  p_max_lat double precision,
  p_min_lng double precision,
  p_max_lng double precision,
  p_exclude uuid default null,
  p_limit int default 200,
  p_city text default null
)
returns table (
  location_id uuid,
  user_id uuid,
  lat double precision,
  lng double precision,
  city text,
  profile jsonb
)
language sql
stable
security invoker
set search_path = public
as $$
  select pins.*
  from public.fetch_map_viewport_pins(
    p_min_lat, p_max_lat, p_min_lng, p_max_lng,
    greatest(1, least(coalesce(p_limit, 200), 200)),
    null,
    null,
    false,
    null, null, null, null, null, null, null, null,
    btrim(p_role),
    null,
    p_city
  ) pins
  where btrim(coalesce(p_role, '')) <> ''
    and (p_exclude is null or pins.user_id <> p_exclude);
$$;

grant execute on function public.fetch_map_profiles_interested_in(
  text, double precision, double precision, double precision, double precision,
  uuid, int, text
) to anon, authenticated;

-- =============================================================================
-- Chat last message per chat
-- =============================================================================

create or replace function public.get_chat_last_messages(p_chat_ids uuid[])
returns table (
  chat_id uuid,
  sender_id uuid,
  created_at timestamptz,
  content text
)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct on (m.chat_id)
         m.chat_id, m.sender_id, m.created_at, m.content
  from public.messages m
  where m.chat_id = any (p_chat_ids)
  order by m.chat_id, m.created_at desc;
$$;

grant execute on function public.get_chat_last_messages(uuid[]) to authenticated;

notify pgrst, 'reload schema';
