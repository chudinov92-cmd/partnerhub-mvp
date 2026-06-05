-- Инженерные профессии в profession_catalog.
-- Безопасно запускать повторно (ON CONFLICT DO UPDATE).
-- Self-hosted Timeweb:
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < /root/zeip/my-app/supabase/sql/2026-06-02-add-engineering-professions.sql

alter table public.profession_catalog
  add column if not exists is_stock boolean not null default false;

insert into public.profession_catalog (label, is_stock)
values
  ('Аэрокосмический инженер', true),
  ('Биомедицинский инженер', true),
  ('Инженер данных (Data Engineer)', true),
  ('Инженер по автоматизации (АСУ ТП)', true),
  ('Инженер по охране труда', true),
  ('Инженер по качеству', true),
  ('Инженер связи', true),
  ('Инженер-геодезист', true),
  ('Инженер-конструктор', true),
  ('Инженер-механик', true),
  ('Инженер-нефтяник / буровик', true),
  ('Инженер-проектировщик', true),
  ('Инженер-программист', true),
  ('Инженер-сметчик', true),
  ('Инженер-строитель', true),
  ('Инженер-технолог', true),
  ('Инженер-эколог', true),
  ('Инженер-электроник (схемотехник)', true),
  ('Инженер-энергетик', true),
  ('Инженер-химик', true),
  ('Инженер-ядерщик', true),
  ('Робототехник', true)
on conflict (label) do update set is_stock = excluded.is_stock;
