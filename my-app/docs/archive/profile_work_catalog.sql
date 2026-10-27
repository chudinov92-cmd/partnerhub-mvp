-- Multiple "Group 2" entries (profession/industry/subindustry/experience)
-- Run in Supabase SQL editor.

create table if not exists public.profile_work (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_title text,
  industry text,
  industry_other text,
  subindustry text,
  experience_years integer,
  created_at timestamptz not null default now()
);

alter table public.profile_work enable row level security;

grant select, insert, update, delete on table public.profile_work to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname='public'
      and tablename='profile_work'
      and policyname='profile_work_rw_own'
  ) then
    create policy profile_work_rw_own
      on public.profile_work
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = profile_work.profile_id
            and p.auth_user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.profiles p
          where p.id = profile_work.profile_id
            and p.auth_user_id = auth.uid()
        )
      );
  end if;
end $$;

