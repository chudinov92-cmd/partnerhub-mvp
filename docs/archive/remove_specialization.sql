-- Remove "specializations" from DB (destructive).
-- Run in Supabase SQL editor when you're ready.

-- 1) Remove legacy tables (if they exist)
drop table if exists public.user_specialties cascade;
drop table if exists public.specialties cascade;

-- 2) Remove profile column used as specialization in UI (`profiles.domain`)
-- If you want to keep history, do: alter table ... rename column ... instead of drop.
alter table public.profiles drop column if exists domain;

-- 3) Remove now-unused column in profession catalog
alter table public.profession_catalog drop column if exists specialties;

