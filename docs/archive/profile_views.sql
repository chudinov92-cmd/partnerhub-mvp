-- Profile views (seen profiles) for map pins.
-- One row = viewer has opened viewed profile (via profile popup).
-- Run in Supabase SQL editor.

create table if not exists public.profile_views (
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (viewer_id, viewed_profile_id)
);

alter table public.profile_views enable row level security;

-- Viewer can select only their own views
drop policy if exists profile_views_select_viewer on public.profile_views;
create policy profile_views_select_viewer
on public.profile_views
for select
to authenticated
using (
  viewer_id in (
    select p.id from public.profiles p where p.auth_user_id = auth.uid()
  )
);

-- Viewer can insert only for themselves
drop policy if exists profile_views_insert_viewer on public.profile_views;
create policy profile_views_insert_viewer
on public.profile_views
for insert
to authenticated
with check (
  viewer_id in (
    select p.id from public.profiles p where p.auth_user_id = auth.uid()
  )
  and viewer_id <> viewed_profile_id
);

-- Viewer can delete only their own views (optional)
drop policy if exists profile_views_delete_viewer on public.profile_views;
create policy profile_views_delete_viewer
on public.profile_views
for delete
to authenticated
using (
  viewer_id in (
    select p.id from public.profiles p where p.auth_user_id = auth.uid()
  )
);

grant select, insert, delete on public.profile_views to authenticated;

