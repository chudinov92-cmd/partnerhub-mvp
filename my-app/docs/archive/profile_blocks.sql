-- Profile blocks (user blocking) for private chats.
-- One row = owner blocked another profile.
-- Run in Supabase SQL editor.

create table if not exists public.profile_blocks (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  blocked_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, blocked_profile_id)
);

alter table public.profile_blocks enable row level security;

-- Owner can view only their blocks
drop policy if exists profile_blocks_select_owner on public.profile_blocks;
create policy profile_blocks_select_owner
on public.profile_blocks
for select
to authenticated
using (
  owner_id in (
    select p.id from public.profiles p where p.auth_user_id = auth.uid()
  )
);

-- Owner can insert only for themselves
drop policy if exists profile_blocks_insert_owner on public.profile_blocks;
create policy profile_blocks_insert_owner
on public.profile_blocks
for insert
to authenticated
with check (
  owner_id in (
    select p.id from public.profiles p where p.auth_user_id = auth.uid()
  )
  and owner_id <> blocked_profile_id
);

-- Owner can delete only their blocks
drop policy if exists profile_blocks_delete_owner on public.profile_blocks;
create policy profile_blocks_delete_owner
on public.profile_blocks
for delete
to authenticated
using (
  owner_id in (
    select p.id from public.profiles p where p.auth_user_id = auth.uid()
  )
);

grant select, insert, delete on public.profile_blocks to authenticated;

-- Ensure helper exists (used in chat policies).
create or replace function public.current_profile_id_auth()
returns uuid
language sql
stable
as $$
  select p.id
  from public.profiles p
  where p.auth_user_id = auth.uid()
  limit 1
$$;

-- Update messages SELECT policy: do not return messages from blocked senders.
-- This ensures blocked users' messages stop appearing and won't be delivered to realtime subscribers.
drop policy if exists messages_select_if_member on public.messages;
create policy messages_select_if_member
  on public.messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.chat_members cm
      where cm.chat_id = messages.chat_id
        and cm.user_id = public.current_profile_id_auth()
    )
    and not exists (
      select 1
      from public.profile_blocks pb
      where pb.owner_id = public.current_profile_id_auth()
        and pb.blocked_profile_id = messages.sender_id
    )
  );

