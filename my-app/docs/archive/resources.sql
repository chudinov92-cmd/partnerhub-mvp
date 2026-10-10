-- Separate "Resources" entity in profile
-- Run in Supabase SQL Editor.

-- 1) Add column
alter table public.profiles
add column if not exists resources text;

-- 2) One-time data migration:
-- We previously used profiles.can_help_with as UI storage for "Ресурсы".
-- Move existing values to the new column if resources is still empty.
update public.profiles
set resources = can_help_with
where (resources is null or btrim(resources) = '')
  and (can_help_with is not null and btrim(can_help_with) <> '');

-- 3) Optional: clear legacy column after migration (keep commented for safety)
-- update public.profiles set can_help_with = null where can_help_with is not null;

