-- Общий чат по городам: индекс под выборку по городу + дате (Supabase SQL Editor).
-- Выполните в проекте Supabase → SQL → New query.

create index if not exists posts_city_created_at_idx
  on public.posts (city, created_at desc);

-- Старые посты могли иметь city = профиль пользователя или NULL.
-- Чтобы не потерять историю в одном из чатов, при необходимости один раз
-- привяжите NULL к выбранному городу (подставьте свой ярлык, например «Пермь»):
--
-- update public.posts
-- set city = 'Пермь'
-- where city is null;
