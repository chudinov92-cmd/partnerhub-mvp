-- fetch_map_viewport_pins: свой и focused-пин даже вне bbox и фильтров.
-- Запуск: Supabase SQL Editor (полный скрипт целиком) или:
-- docker exec -i supabase-db psql -U supabase_admin -d postgres < supabase/sql/2026-09-17-fetch-map-viewport-pins-own-outside-bbox.sql

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
  with in_view as (
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
  extras as (
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
      and p.deleted_at is null
      and (
        (p_own is not null and l.user_id = p_own)
        or (p_focused is not null and l.user_id = p_focused)
      )
      and not exists (
        select 1 from in_view v where v.user_id = l.user_id
      )
  ),
  filtered as (
    select * from in_view
    union all
    select * from extras
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

comment on function public.fetch_map_viewport_pins(
  double precision, double precision, double precision, double precision, int,
  uuid, uuid, boolean,
  text, text, text, text, int, int, timestamptz, text[], text, uuid[], text
) is
  'Пины viewport; p_own и p_focused всегда в выдаче, даже вне bbox и фильтров';

notify pgrst, 'reload schema';
