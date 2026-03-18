-- Industry & subindustry catalogs (source of truth for dropdowns)
-- Run in Supabase SQL editor.

create table if not exists public.industry_catalog (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.subindustry_catalog (
  id uuid primary key default gen_random_uuid(),
  industry_label text not null,
  label text not null,
  created_at timestamptz not null default now(),
  unique (industry_label, label)
);

alter table public.industry_catalog enable row level security;
alter table public.subindustry_catalog enable row level security;

-- Grants (Postgres privileges)
grant select on table public.industry_catalog to anon, authenticated;
grant insert on table public.industry_catalog to authenticated;

grant select on table public.subindustry_catalog to anon, authenticated;
grant insert on table public.subindustry_catalog to authenticated;

-- Policies
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'industry_catalog'
      and policyname = 'industry_catalog_select_all'
  ) then
    create policy industry_catalog_select_all
      on public.industry_catalog
      for select
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'industry_catalog'
      and policyname = 'industry_catalog_insert_authenticated'
  ) then
    create policy industry_catalog_insert_authenticated
      on public.industry_catalog
      for insert
      to authenticated
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'subindustry_catalog'
      and policyname = 'subindustry_catalog_select_all'
  ) then
    create policy subindustry_catalog_select_all
      on public.subindustry_catalog
      for select
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'subindustry_catalog'
      and policyname = 'subindustry_catalog_insert_authenticated'
  ) then
    create policy subindustry_catalog_insert_authenticated
      on public.subindustry_catalog
      for insert
      to authenticated
      with check (true);
  end if;
end $$;

