-- Contacts (favorites) for profiles.
-- One row = owner added another profile to contacts.
-- Run in Supabase SQL editor.

create table if not exists public.profile_contacts (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  contact_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, contact_profile_id)
);

alter table public.profile_contacts enable row level security;

-- Owner can view only their contacts
drop policy if exists profile_contacts_select_owner on public.profile_contacts;
create policy profile_contacts_select_owner
on public.profile_contacts
for select
to authenticated
using (
  owner_id in (
    select p.id from public.profiles p where p.auth_user_id = auth.uid()
  )
);

-- Owner can insert only for themselves
drop policy if exists profile_contacts_insert_owner on public.profile_contacts;
create policy profile_contacts_insert_owner
on public.profile_contacts
for insert
to authenticated
with check (
  owner_id in (
    select p.id from public.profiles p where p.auth_user_id = auth.uid()
  )
  and owner_id <> contact_profile_id
);

-- Owner can delete only their contacts
drop policy if exists profile_contacts_delete_owner on public.profile_contacts;
create policy profile_contacts_delete_owner
on public.profile_contacts
for delete
to authenticated
using (
  owner_id in (
    select p.id from public.profiles p where p.auth_user_id = auth.uid()
  )
);

grant select, insert, delete on public.profile_contacts to authenticated;

