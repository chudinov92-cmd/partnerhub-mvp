-- Online / Offline status (last activity timestamp)
-- Run in Supabase SQL Editor.

alter table public.profiles
add column if not exists last_seen_at timestamptz;

-- Allow everyone to read last_seen_at (needed for "online" dots in UI)
-- (Assumes you already allow select on public.profiles for app reads.)

-- Allow authenticated users to update ONLY their own last_seen_at.
-- We do not restrict update columns at RLS level; app code updates only last_seen_at.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_update_last_seen_own'
  ) then
    create policy profiles_update_last_seen_own
      on public.profiles
      for update
      to authenticated
      using (auth_user_id = auth.uid())
      with check (auth_user_id = auth.uid());
  end if;
end $$;

-- Optional: index for faster "online" checks / ordering
create index if not exists profiles_last_seen_at_idx on public.profiles(last_seen_at);

