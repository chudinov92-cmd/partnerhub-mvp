-- Zeip Admin Panel v1: RBAC + reports + post moderation + audit
-- Run in Supabase SQL Editor (one-time / idempotent where possible).

begin;

-- =========================
-- 1) RBAC: admin_users roles
-- =========================

create table if not exists public.admin_users (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

alter table public.admin_users
  add column if not exists role text not null default 'support'
    check (role in ('super_admin','moderator','support'));

alter table public.admin_users
  add column if not exists created_by uuid references auth.users(id) on delete set null;

grant select on public.admin_users to authenticated;

-- Users can read only their own admin row (used by UI to detect access).
drop policy if exists admin_users_select_self on public.admin_users;
create policy admin_users_select_self
on public.admin_users
for select
to authenticated
using (auth_user_id = auth.uid());

-- Helper: is current auth user admin?
create or replace function public.is_admin_auth()
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from public.admin_users a
    where a.auth_user_id = auth.uid()
  );
$$;

-- Helper: current admin role (null if not admin)
create or replace function public.admin_role_auth()
returns text
language sql
stable
as $$
  select a.role
  from public.admin_users a
  where a.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_super_admin_auth()
returns boolean
language sql
stable
as $$
  select public.admin_role_auth() = 'super_admin';
$$;

create or replace function public.is_moderator_auth()
returns boolean
language sql
stable
as $$
  select public.admin_role_auth() in ('super_admin','moderator');
$$;

create or replace function public.is_support_auth()
returns boolean
language sql
stable
as $$
  select public.admin_role_auth() in ('super_admin','moderator','support');
$$;

-- Admin management policies (only super_admin can manage admin_users)
drop policy if exists admin_users_manage_super_admin_select on public.admin_users;
create policy admin_users_manage_super_admin_select
on public.admin_users
for select
to authenticated
using (public.is_super_admin_auth() or auth_user_id = auth.uid());

drop policy if exists admin_users_manage_super_admin_insert on public.admin_users;
create policy admin_users_manage_super_admin_insert
on public.admin_users
for insert
to authenticated
with check (public.is_super_admin_auth());

drop policy if exists admin_users_manage_super_admin_update on public.admin_users;
create policy admin_users_manage_super_admin_update
on public.admin_users
for update
to authenticated
using (public.is_super_admin_auth())
with check (public.is_super_admin_auth());

drop policy if exists admin_users_manage_super_admin_delete on public.admin_users;
create policy admin_users_manage_super_admin_delete
on public.admin_users
for delete
to authenticated
using (public.is_super_admin_auth());


-- =========================
-- 2) Profiles: admin block flag
-- =========================

alter table public.profiles
add column if not exists is_blocked boolean not null default false;

-- Allow moderators to update profiles (for block/unblock and moderation actions).
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update
on public.profiles
for update
to authenticated
using (public.is_moderator_auth())
with check (public.is_moderator_auth());


-- =========================
-- 3) Posts moderation fields
-- =========================

alter table public.posts
  add column if not exists moderation_status text not null default 'active'
    check (moderation_status in ('active','hidden','deleted'));

alter table public.posts
  add column if not exists moderation_reason text;

alter table public.posts
  add column if not exists moderated_by uuid references auth.users(id) on delete set null;

alter table public.posts
  add column if not exists moderated_at timestamptz;

-- If you use city-scoped chat, ensure city exists (best-effort).
alter table public.posts
  add column if not exists city text;

create index if not exists posts_city_created_at_idx
  on public.posts (city, created_at desc);

-- Admin can update moderation fields (hide/restore). Only super_admin can hard-delete.
drop policy if exists posts_admin_update_moderation on public.posts;
create policy posts_admin_update_moderation
on public.posts
for update
to authenticated
using (public.is_moderator_auth())
with check (public.is_moderator_auth());

drop policy if exists posts_admin_delete on public.posts;
create policy posts_admin_delete
on public.posts
for delete
to authenticated
using (public.is_super_admin_auth());

-- =========================
-- 3.5) Catalog admin policies (override old is_admin_auth policies)
-- =========================

-- Catalogs: super_admin can insert/delete industries/subindustries/professions
drop policy if exists profession_catalog_admin_insert on public.profession_catalog;
create policy profession_catalog_admin_insert
on public.profession_catalog
for insert
to authenticated
with check (public.is_super_admin_auth());

drop policy if exists profession_catalog_admin_delete on public.profession_catalog;
create policy profession_catalog_admin_delete
on public.profession_catalog
for delete
to authenticated
using (public.is_super_admin_auth());

drop policy if exists industry_catalog_admin_insert on public.industry_catalog;
create policy industry_catalog_admin_insert
on public.industry_catalog
for insert
to authenticated
with check (public.is_super_admin_auth());

drop policy if exists industry_catalog_admin_delete on public.industry_catalog;
create policy industry_catalog_admin_delete
on public.industry_catalog
for delete
to authenticated
using (public.is_super_admin_auth());

drop policy if exists subindustry_catalog_admin_insert on public.subindustry_catalog;
create policy subindustry_catalog_admin_insert
on public.subindustry_catalog
for insert
to authenticated
with check (public.is_super_admin_auth());

drop policy if exists subindustry_catalog_admin_delete on public.subindustry_catalog;
create policy subindustry_catalog_admin_delete
on public.subindustry_catalog
for delete
to authenticated
using (public.is_super_admin_auth());


-- =========================
-- 4) Abuse reports
-- =========================

create table if not exists public.abuse_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_profile_id uuid references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('profile','post','message')),
  target_id uuid not null,
  category text not null,
  comment text,
  status text not null default 'new' check (status in ('new','in_review','resolved','rejected')),
  assigned_to uuid references auth.users(id) on delete set null,
  resolution text,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists abuse_reports_status_created_at_idx
  on public.abuse_reports (status, created_at desc);

create table if not exists public.abuse_report_events (
  id bigserial primary key,
  report_id uuid not null references public.abuse_reports(id) on delete cascade,
  actor_auth_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists abuse_report_events_report_id_idx
  on public.abuse_report_events (report_id, created_at desc);

alter table public.abuse_reports enable row level security;
alter table public.abuse_report_events enable row level security;

-- Regular users can create a report as authenticated (reporter_profile_id must be theirs if set).
drop policy if exists abuse_reports_insert_authed on public.abuse_reports;
create policy abuse_reports_insert_authed
on public.abuse_reports
for insert
to authenticated
with check (
  reporter_profile_id is null
  or reporter_profile_id in (
    select p.id from public.profiles p where p.auth_user_id = auth.uid()
  )
);

-- Admins can read/update all reports.
drop policy if exists abuse_reports_admin_select on public.abuse_reports;
create policy abuse_reports_admin_select
on public.abuse_reports
for select
to authenticated
using (public.is_support_auth());

drop policy if exists abuse_reports_admin_update on public.abuse_reports;
create policy abuse_reports_admin_update
on public.abuse_reports
for update
to authenticated
using (public.is_support_auth())
with check (public.is_support_auth());

-- Events: admins can read/insert.
drop policy if exists abuse_report_events_admin_select on public.abuse_report_events;
create policy abuse_report_events_admin_select
on public.abuse_report_events
for select
to authenticated
using (public.is_support_auth());

drop policy if exists abuse_report_events_admin_insert on public.abuse_report_events;
create policy abuse_report_events_admin_insert
on public.abuse_report_events
for insert
to authenticated
with check (public.is_support_auth());

grant select, insert, update on public.abuse_reports to authenticated;
grant select, insert on public.abuse_report_events to authenticated;


-- =========================
-- 5) Admin notes (profile internal notes)
-- =========================

create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  target_profile_id uuid not null references public.profiles(id) on delete cascade,
  note text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists admin_notes_target_profile_id_idx
  on public.admin_notes (target_profile_id, created_at desc);

alter table public.admin_notes enable row level security;

drop policy if exists admin_notes_admin_select on public.admin_notes;
create policy admin_notes_admin_select
on public.admin_notes
for select
to authenticated
using (public.is_support_auth());

drop policy if exists admin_notes_admin_insert on public.admin_notes;
create policy admin_notes_admin_insert
on public.admin_notes
for insert
to authenticated
with check (public.is_support_auth());

grant select, insert on public.admin_notes to authenticated;


-- =========================
-- 6) Audit log (admin actions)
-- =========================

create table if not exists public.admin_audit_log (
  id bigserial primary key,
  actor_auth_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

drop policy if exists admin_audit_log_admin_select on public.admin_audit_log;
create policy admin_audit_log_admin_select
on public.admin_audit_log
for select
to authenticated
using (public.is_support_auth());

drop policy if exists admin_audit_log_admin_insert on public.admin_audit_log;
create policy admin_audit_log_admin_insert
on public.admin_audit_log
for insert
to authenticated
with check (public.is_support_auth());

grant select, insert on public.admin_audit_log to authenticated;

commit;

-- =========================
-- After running:
-- 1) Insert at least one super admin:
-- insert into public.admin_users(auth_user_id, role, created_by)
-- values ('<auth_user_uuid>', 'super_admin', '<auth_user_uuid>')
-- on conflict (auth_user_id) do update set role = excluded.role;
-- =========================

