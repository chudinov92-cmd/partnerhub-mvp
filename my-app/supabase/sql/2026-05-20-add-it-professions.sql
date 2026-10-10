-- IT и смежные профессии в profession_catalog.
-- Безопасно запускать повторно (ON CONFLICT DO NOTHING).
-- Self-hosted Timeweb:
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < /root/zeip/my-app/supabase/sql/2026-05-20-add-it-professions.sql

insert into public.profession_catalog (label)
values
  ('Front-end разработчик'),
  ('Back-end разработчик'),
  ('Full-stack разработчик'),
  ('iOS-разработчик'),
  ('Android-разработчик'),
  ('Мобильный разработчик'),
  ('Веб-разработчик'),
  ('1С-разработчик'),
  ('Разработчик игр'),
  ('Embedded-разработчик'),
  ('Тимлид'),
  ('Data Scientist'),
  ('ML-инженер'),
  ('BI-аналитик'),
  ('Системный аналитик'),
  ('UX/UI-дизайнер'),
  ('Продуктовый дизайнер'),
  ('Моушн-дизайнер'),
  ('Графический дизайнер'),
  ('DevOps-инженер'),
  ('Системный администратор'),
  ('Сетевой инженер'),
  ('Специалист по информационной безопасности'),
  ('Облачный инженер'),
  ('Scrum Master'),
  ('Продакт-менеджер'),
  ('HR-менеджер'),
  ('Рекрутер'),
  ('PR-менеджер')
on conflict (label) do nothing;
