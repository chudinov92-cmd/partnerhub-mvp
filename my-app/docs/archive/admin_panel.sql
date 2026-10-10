-- Admin panel setup for /admin
-- Run this script once in Supabase SQL Editor.

-- 1) Admin users (by auth.users.id)
create table if not exists public.admin_users (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

grant select on public.admin_users to authenticated;

drop policy if exists admin_users_select_self on public.admin_users;
create policy admin_users_select_self
on public.admin_users
for select
to authenticated
using (auth_user_id = auth.uid());

-- 2) Block flag in profiles
alter table public.profiles
add column if not exists is_blocked boolean not null default false;

-- 2.5) Stock flags for catalog rows
-- Seed-baseline stock flags.
-- We reset all flags to non-stock first, then mark only the current seed lists as "stock".
-- New rows added by users/admin afterwards will default to non-stock and will require confirmation.
alter table public.industry_catalog
  add column if not exists is_stock boolean not null default false;
alter table public.subindustry_catalog
  add column if not exists is_stock boolean not null default false;
alter table public.profession_catalog
  add column if not exists is_stock boolean not null default false;

update public.industry_catalog set is_stock = false;

update public.subindustry_catalog set is_stock = false;

update public.profession_catalog set is_stock = false;

update public.industry_catalog set is_stock = true where label in ('Природные ресурсы', 'Промышленность', 'Строительство и инфраструктура', 'Торговля', 'Транспорт и логистика', 'Финансы', 'Информационные технологии', 'Телекоммуникации и связь', 'Недвижимость', 'Государственный сектор', 'Event-индустрия', 'Искусство', 'Медиапроизводство и съёмка', 'Услуги');

update public.subindustry_catalog set is_stock = true where (industry_label, label) in (('Природные ресурсы', 'Сельское хозяйство'), ('Природные ресурсы', 'Лесное хозяйство'), ('Природные ресурсы', 'Рыболовство'), ('Природные ресурсы', 'Охота'), ('Природные ресурсы', 'Горнодобывающая промышленность'), ('Природные ресурсы', 'Нефть и газ'), ('Природные ресурсы', 'Энергетика'), ('Природные ресурсы', 'Водные ресурсы'), ('Промышленность', 'Производство'), ('Промышленность', 'Машиностроение'), ('Промышленность', 'Химическая промышленность'), ('Промышленность', 'Металлургия'), ('Промышленность', 'Электроника'), ('Промышленность', 'Авиационная промышленность'), ('Промышленность', 'Космическая промышленность'), ('Промышленность', 'Оборонная промышленность'), ('Промышленность', 'Биотехнологии'), ('Промышленность', 'Фармацевтика'), ('Промышленность', 'Робототехника'), ('Строительство и инфраструктура', 'Строительство'), ('Строительство и инфраструктура', 'Архитектура'), ('Строительство и инфраструктура', 'Девелопмент'), ('Строительство и инфраструктура', 'Инженерия'), ('Строительство и инфраструктура', 'Урбанистика'), ('Строительство и инфраструктура', 'Дорожное строительство'), ('Строительство и инфраструктура', 'ЖКХ'), ('Торговля', 'Оптовая торговля'), ('Торговля', 'Розничная торговля'), ('Торговля', 'Ecommerce'), ('Торговля', 'Маркетплейсы'), ('Торговля', 'Dropshipping'), ('Торговля', 'Импорт / экспорт'), ('Транспорт и логистика', 'Авиация'), ('Транспорт и логистика', 'Морские перевозки'), ('Транспорт и логистика', 'Железные дороги'), ('Транспорт и логистика', 'Автотранспорт'), ('Транспорт и логистика', 'Логистика'), ('Транспорт и логистика', 'Supply chain'), ('Транспорт и логистика', 'Складирование'), ('Транспорт и логистика', 'Delivery-сервисы'), ('Финансы', 'Банки'), ('Финансы', 'Инвестиции'), ('Финансы', 'Страхование'), ('Финансы', 'FinTech'), ('Финансы', 'Криптоиндустрия'), ('Финансы', 'Venture capital'), ('Финансы', 'Private equity'), ('Финансы', 'Hedge funds'), ('Финансы', 'Трейдинг'), ('Информационные технологии', 'Разработка программного обеспечения'), ('Информационные технологии', 'Данные и Искусственный Интеллект (Data & AI)'), ('Информационные технологии', 'Инфраструктура и Администрирование'), ('Информационные технологии', 'Информационная безопасность (InfoSec)'), ('Информационные технологии', 'Бизнес-аналитика и Управление проектами'), ('Информационные технологии', 'Веб-технологии и Дизайн'), ('Телекоммуникации и связь', 'Мобильная связь'), ('Телекоммуникации и связь', 'Интернет-провайдеры'), ('Телекоммуникации и связь', 'Сетевое оборудование'), ('Телекоммуникации и связь', 'Спутниковая связь'), ('Телекоммуникации и связь', '5G и новые стандарты'), ('Телекоммуникации и связь', 'VoIP и унифицированные коммуникации'), ('Телекоммуникации и связь', 'Радиосвязь'), ('Телекоммуникации и связь', 'Дата-центры и инфраструктура связи'), ('Недвижимость', 'Real estate'), ('Недвижимость', 'PropTech'), ('Недвижимость', 'Управление недвижимостью'), ('Недвижимость', 'Аренда'), ('Недвижимость', 'Коммерческая недвижимость'), ('Недвижимость', 'Жилая недвижимость'), ('Государственный сектор', 'Государственное управление'), ('Государственный сектор', 'Муниципальное управление'), ('Государственный сектор', 'Вооружённые силы'), ('Государственный сектор', 'Госуслуги'), ('Государственный сектор', 'Регулирование'), ('Государственный сектор', 'Налоговые службы'), ('Event-индустрия', 'Организация и управление мероприятиями'), ('Event-индустрия', 'Event-маркетинг и коммуникации'), ('Event-индустрия', 'Режиссура и креативное проектирование'), ('Event-индустрия', 'Технический продакшн'), ('Event-индустрия', 'Ивент-дизайн и оформление'), ('Искусство', 'Изобразительное искусство'), ('Искусство', 'Цифровое искусство и новые медиа'), ('Искусство', 'Сценография и театр'), ('Искусство', 'Реставрация и консервация'), ('Искусство', 'Арт-менеджмент и кураторство'), ('Искусство', 'Прикладное творчество и ремесла'), ('Медиапроизводство и съёмка', 'Видеосъёмка'), ('Медиапроизводство и съёмка', 'Фотосъёмка'), ('Медиапроизводство и съёмка', 'Монтаж и постпродакшн'), ('Медиапроизводство и съёмка', 'Звук и саунд-дизайн'), ('Медиапроизводство и съёмка', 'Операторское мастерство'), ('Медиапроизводство и съёмка', 'Продюсирование и организация съёмок'), ('Услуги', 'Строительство и ремонт'), ('Услуги', 'Туризм и путешествия'), ('Услуги', 'Транспортные услуги'), ('Услуги', 'Образование'), ('Услуги', 'Медицина и здоровье'), ('Услуги', 'Спорт и фитнес'), ('Услуги', 'Beauty-индустрия');

update public.profession_catalog set is_stock = true where label in ('DJ', 'Event-координатор', 'Event-менеджер', 'SEO-специалист', 'SMM менеджер', 'VJ', 'Администратор', 'Аналитик', 'Арт-дилер', 'Арт-директор', 'Арт-менеджер', 'Арт-практик в сфере ИИ', 'Бариста', 'Бармен', 'Бизнес-аналитик', 'Бухгалтер', 'Ведущий мероприятий', 'Видеограф', 'Видеомонтажёр', 'Видеооператор', 'Водитель', 'Врач', 'Галерист', 'Гафер', 'Грузчик', 'Декоратор мероприятий', 'Дизайнер', 'Дизайнер выставочных экспозиций', 'Дизайнер инсталляций', 'Звукооператор', 'Звукорежиссёр', 'Ивент-продюсер', 'Инженер', 'Инженер впечатлений', 'Инженер сцены', 'Кладовщик', 'Композитор', 'Копирайтер', 'Креативный директор', 'Креативный продюсер', 'Креативный проектировщик', 'Куратор', 'Курьер', 'Лейаут-артист', 'Маркетолог', 'Мастер декоративно-прикладного искусства', 'Мастер флористического сервиса', 'Медиапланер', 'Менеджер', 'Менеджер по продажам', 'Менеджер по продажам B2B', 'Менеджер по event-маркетингу', 'Менеджер по работе с волонтёрами', 'Менеджер по работе с партнёрами и спикерами', 'Менеджер по туризму', 'Менеджер продукта', 'Менеджер проектов', 'Мерчандайзер', 'Модератор мероприятий', 'Монтажник', 'Начинающий специалист', 'Оператор', 'Оператор дрона', 'Организатор арт-резиденций', 'Организатор мероприятий', 'Осветитель', 'Официант', 'Охранник', 'Перформер', 'Повар', 'Помощник', 'Преподаватель', 'Программист', 'QA-инжинер', 'Продавец', 'Промоутер', 'Рабочий', 'Режиссёр мероприятий', 'Режиссёр монтажа', 'Реставратор', 'Риггер', 'Руководитель', 'Саунд-артист', 'Саунд-дизайнер', 'Светодизайнер', 'Секретарь', 'Скульптор', 'Слесарь', 'Сотрудник ПВЗ', 'Специалист', 'Специалист по истории искусства и кураторству', 'Специалист по конгрессно-выставочной деятельности', 'Специалист по логистике мероприятий', 'Специалист по мультимедийному оборудованию', 'Специалист по продвижению мероприятий', 'Специалист по световому оборудованию', 'Спикер-менеджер', 'Сценарист мероприятий', 'Сценограф', 'Сценограф событий', 'Тайный покупатель', 'Технический директор', 'Технический писатель', 'Токарь', 'Торговый представитель', 'Уборщик', 'Упаковщик', 'Управляющий', 'Флорист', 'Флорист-декоратор', 'Фотограф', 'Художественный критик', 'Художник', 'Шоу-дизайнер', 'Экономист', 'Юрист');

-- Helper: current authenticated user is admin?
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

-- 3) Policies for admin actions

-- Profiles: admin can update rows (for block/unblock).
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update
on public.profiles
for update
to authenticated
using (public.is_admin_auth())
with check (public.is_admin_auth());

-- Posts: admin can delete any post from general chat.
drop policy if exists posts_admin_delete on public.posts;
create policy posts_admin_delete
on public.posts
for delete
to authenticated
using (public.is_admin_auth());

-- Catalogs: admin can insert/delete industries/subindustries/professions
drop policy if exists profession_catalog_admin_insert on public.profession_catalog;
create policy profession_catalog_admin_insert
on public.profession_catalog
for insert
to authenticated
with check (public.is_admin_auth());

drop policy if exists profession_catalog_admin_delete on public.profession_catalog;
create policy profession_catalog_admin_delete
on public.profession_catalog
for delete
to authenticated
using (public.is_admin_auth());

drop policy if exists industry_catalog_admin_insert on public.industry_catalog;
create policy industry_catalog_admin_insert
on public.industry_catalog
for insert
to authenticated
with check (public.is_admin_auth());

drop policy if exists industry_catalog_admin_delete on public.industry_catalog;
create policy industry_catalog_admin_delete
on public.industry_catalog
for delete
to authenticated
using (public.is_admin_auth());

drop policy if exists subindustry_catalog_admin_insert on public.subindustry_catalog;
create policy subindustry_catalog_admin_insert
on public.subindustry_catalog
for insert
to authenticated
with check (public.is_admin_auth());

drop policy if exists subindustry_catalog_admin_delete on public.subindustry_catalog;
create policy subindustry_catalog_admin_delete
on public.subindustry_catalog
for delete
to authenticated
using (public.is_admin_auth());

-- 4) Optional: block posting/messaging from blocked users at DB level
-- (safe if rows exist in profiles for each sender/author)
drop policy if exists posts_insert_not_blocked on public.posts;
create policy posts_insert_not_blocked
on public.posts
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = posts.author_id
      and p.auth_user_id = auth.uid()
      and coalesce(p.is_blocked, false) = false
  )
);

drop policy if exists messages_insert_not_blocked on public.messages;
create policy messages_insert_not_blocked
on public.messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = messages.sender_id
      and p.auth_user_id = auth.uid()
      and coalesce(p.is_blocked, false) = false
  )
);

-- 5) Add your admin user(s)
-- Replace with your auth user id(s).
-- Example:
-- insert into public.admin_users(auth_user_id)
-- values ('00000000-0000-0000-0000-000000000000')
-- on conflict (auth_user_id) do nothing;

