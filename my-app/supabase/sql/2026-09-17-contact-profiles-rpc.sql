-- RPC: профили избранных контактов владельца (без map_visible, с проверкой owner).
-- Запуск на VPS:
-- cd /Users/vladimirchudinov/Desktop/my-startup/my-app
-- ssh root@<VPS_IP>
-- docker exec -i supabase-db psql -U supabase_admin -d postgres \
--   < /root/zeip/my-app/supabase/sql/2026-09-17-contact-profiles-rpc.sql

create or replace function public.get_contact_profiles(p_owner_id uuid)
returns table (
  id uuid,
  full_name text,
  age integer,
  city text,
  industry text,
  subindustry text,
  role_title text,
  last_seen_at timestamptz,
  content_updated_at timestamptz,
  skills text,
  resources text,
  current_status text,
  experience_years integer,
  interested_in text,
  seeking text[],
  rating_avg numeric,
  rating_count integer,
  is_pro boolean,
  pro_expires_at timestamptz,
  subscription_plan text,
  deleted_at timestamptz,
  contact_created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pc.contact_profile_id as id,
    coalesce(nullif(trim(p.full_name), ''), 'Профиль недоступен') as full_name,
    p.age,
    p.city,
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
    p.subscription_plan::text,
    p.deleted_at,
    pc.created_at as contact_created_at
  from public.profile_contacts pc
  left join public.profiles p on p.id = pc.contact_profile_id
  where pc.owner_id = p_owner_id
    and pc.owner_id in (
      select pr.id
      from public.profiles pr
      where pr.auth_user_id = auth.uid()
    )
  order by pc.created_at desc
  limit 500;
$$;

revoke all on function public.get_contact_profiles(uuid) from public;
grant execute on function public.get_contact_profiles(uuid) to authenticated;
