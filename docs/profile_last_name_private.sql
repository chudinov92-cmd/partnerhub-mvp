-- Private last name (owner-only) + default country Russia.
-- Run in Supabase SQL editor (self-host / Timeweb).

alter table public.profiles
  alter column country set default 'Россия';

update public.profiles
set country = 'Россия'
where country is null or btrim(country) = '';

create table if not exists public.profile_private (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  last_name text,
  updated_at timestamptz not null default now()
);

alter table public.profile_private enable row level security;

drop policy if exists profile_private_select_own on public.profile_private;
create policy profile_private_select_own
  on public.profile_private
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_private.profile_id
        and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists profile_private_insert_own on public.profile_private;
create policy profile_private_insert_own
  on public.profile_private
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_private.profile_id
        and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists profile_private_update_own on public.profile_private;
create policy profile_private_update_own
  on public.profile_private
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_private.profile_id
        and p.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_private.profile_id
        and p.auth_user_id = auth.uid()
    )
  );

grant select, insert, update on table public.profile_private to authenticated;

notify pgrst, 'reload schema';
