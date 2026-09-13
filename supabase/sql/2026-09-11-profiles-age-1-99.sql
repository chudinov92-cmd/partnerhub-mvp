-- Ограничение возраста в profiles: 1–99 или NULL.
-- Запуск (self-hosted на VPS):
--   cd /root/zeip/my-app
--   psql "$DATABASE_URL" -f supabase/sql/2026-09-11-profiles-age-1-99.sql

-- Сброс некорректных значений перед CHECK
update public.profiles
set age = null
where age is not null
  and (age < 1 or age > 99);

alter table public.profiles
  drop constraint if exists profiles_age_range_check;

alter table public.profiles
  add constraint profiles_age_range_check
  check (age is null or (age >= 1 and age <= 99));

comment on column public.profiles.age is
  'Возраст пользователя (1–99), NULL если не указан';
