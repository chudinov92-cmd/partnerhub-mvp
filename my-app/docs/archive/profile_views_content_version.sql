-- Profile content versioning for map pin "viewed" state.
-- A pin is "viewed" only when profile_views.viewed_content_updated_at >= profiles.content_updated_at.
-- Bump content_updated_at on /profile form fields and profile_work changes only (not city/pin/last_seen_at).
-- Run in Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- profiles.content_updated_at
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists content_updated_at timestamptz not null default now();

update public.profiles
set content_updated_at = now()
where content_updated_at is null;

create or replace function public.profiles_bump_content_updated_at()
returns trigger
language plpgsql
as $$
begin
  if (
    new.full_name,
    new.age,
    new.industry,
    new.industry_other,
    new.subindustry,
    new.role_title,
    new.experience_years,
    new.current_status,
    new.skills,
    new.looking_for,
    new.resources,
    new.interested_in
  ) is distinct from (
    old.full_name,
    old.age,
    old.industry,
    old.industry_other,
    old.subindustry,
    old.role_title,
    old.experience_years,
    old.current_status,
    old.skills,
    old.looking_for,
    old.resources,
    old.interested_in
  ) then
    new.content_updated_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_bump_content_updated_at on public.profiles;
create trigger trg_profiles_bump_content_updated_at
  before update on public.profiles
  for each row
  execute function public.profiles_bump_content_updated_at();

-- ---------------------------------------------------------------------------
-- profile_work → bump parent profile content_updated_at
-- ---------------------------------------------------------------------------

create or replace function public.profile_work_bump_profile_content_updated_at()
returns trigger
language plpgsql
as $$
declare
  pid uuid;
begin
  pid := coalesce(new.profile_id, old.profile_id);
  if pid is not null then
    update public.profiles
    set content_updated_at = now()
    where id = pid;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profile_work_bump_content on public.profile_work;
create trigger trg_profile_work_bump_content
  after insert or update or delete on public.profile_work
  for each row
  execute function public.profile_work_bump_profile_content_updated_at();

-- ---------------------------------------------------------------------------
-- profile_views.viewed_content_updated_at
-- ---------------------------------------------------------------------------

alter table public.profile_views
  add column if not exists viewed_content_updated_at timestamptz not null default now();

-- Existing views stay "viewed" until the profile owner edits form content.
update public.profile_views pv
set viewed_content_updated_at = p.content_updated_at
from public.profiles p
where p.id = pv.viewed_profile_id;

-- ---------------------------------------------------------------------------
-- RLS: allow upsert (update own rows)
-- ---------------------------------------------------------------------------

drop policy if exists profile_views_update_viewer on public.profile_views;
create policy profile_views_update_viewer
on public.profile_views
for update
to authenticated
using (
  viewer_id in (
    select p.id from public.profiles p where p.auth_user_id = auth.uid()
  )
)
with check (
  viewer_id in (
    select p.id from public.profiles p where p.auth_user_id = auth.uid()
  )
  and viewer_id <> viewed_profile_id
);

grant select, insert, update, delete on public.profile_views to authenticated;
