-- Current status for profile editing ("Текущий статус")
-- Run in Supabase SQL editor.

alter table public.profiles
add column if not exists current_status text;

