-- Add new profession options into public.profession_catalog
-- Safe to run multiple times (ON CONFLICT DO NOTHING).

insert into public.profession_catalog (label)
values
  ('Менеджер по продажам'),
  ('Менеджер по продажам B2B'),
  ('QA-инжинер')
on conflict (label) do nothing;

