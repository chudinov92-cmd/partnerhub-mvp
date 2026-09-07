-- Profession catalog (source of truth for UI dropdowns)
-- Run in Supabase SQL editor.

create table if not exists public.profession_catalog (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profession_catalog enable row level security;

-- Grants (Postgres privileges). RLS policies are not enough without GRANTs.
grant select on table public.profession_catalog to anon, authenticated;
grant insert on table public.profession_catalog to authenticated;

-- Readable for everyone (including anon) so dropdowns work before login.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profession_catalog'
      and policyname = 'profession_catalog_select_all'
  ) then
    create policy profession_catalog_select_all
      on public.profession_catalog
      for select
      using (true);
  end if;
end $$;

-- Insert allowed for authenticated users (needed for "Другое..." → add new profession on save)
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profession_catalog'
      and policyname = 'profession_catalog_insert_authenticated'
  ) then
    create policy profession_catalog_insert_authenticated
      on public.profession_catalog
      for insert
      to authenticated
      with check (true);
  end if;
end $$;

-- Optional: prevent updates/deletes from clients by not creating policies for them.

