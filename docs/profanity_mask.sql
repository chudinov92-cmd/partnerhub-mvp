-- Profanity masking (Russian "mat") on write + optional cleanup.
-- Run in Supabase SQL editor.

-- 1) Terms table (editable later)
create table if not exists public.profanity_terms (
  id bigserial primary key,
  pattern text not null unique
);

-- Minimal base list (patterns are regexp; update this table to extend)
insert into public.profanity_terms(pattern) values
  ('хуй[а-яё]*'),
  ('пизд[а-яё]*'),
  ('еба[а-яё]*'),
  ('еб[её][а-яё]*'),
  ('бля[а-яё]*'),
  ('сука[а-яё]*'),
  ('гандон[а-яё]*'),
  ('говн[а-яё]*'),
  ('мраз[а-яё]*'),
  ('шлюх[а-яё]*')
on conflict (pattern) do nothing;

-- 2) Masking function
create or replace function public.mask_profanity(input text)
returns text
language plpgsql
as $$
declare
  t record;
  out text;
begin
  if input is null then
    return null;
  end if;

  out := input;

  for t in
    select pattern from public.profanity_terms
  loop
    out := regexp_replace(out, t.pattern, '***', 'gi');
  end loop;

  return out;
end;
$$;

-- 3) Triggers

-- posts (общий чат)
create or replace function public.trg_posts_mask_profanity()
returns trigger
language plpgsql
as $$
begin
  new.body := public.mask_profanity(new.body);
  return new;
end;
$$;

drop trigger if exists posts_mask_profanity on public.posts;
create trigger posts_mask_profanity
before insert or update
on public.posts
for each row
execute function public.trg_posts_mask_profanity();

-- messages (личные чаты)
-- По правилу продукта: личные сообщения НЕ маскируем.

-- profiles (имя + профессия/отрасли/подотрасли)
create or replace function public.trg_profiles_mask_profanity()
returns trigger
language plpgsql
as $$
begin
  new.full_name := public.mask_profanity(new.full_name);
  new.role_title := public.mask_profanity(new.role_title);
  new.industry_other := public.mask_profanity(new.industry_other);
  new.subindustry := public.mask_profanity(new.subindustry);
  new.skills := public.mask_profanity(new.skills);
  new.looking_for := public.mask_profanity(new.looking_for);
  new.can_help_with := public.mask_profanity(new.can_help_with);
  new.interested_in := public.mask_profanity(new.interested_in);
  return new;
end;
$$;

drop trigger if exists profiles_mask_profanity on public.profiles;
create trigger profiles_mask_profanity
before insert or update
on public.profiles
for each row
execute function public.trg_profiles_mask_profanity();

-- profile_work (доп. блоки)
create or replace function public.trg_profile_work_mask_profanity()
returns trigger
language plpgsql
as $$
begin
  new.role_title := public.mask_profanity(new.role_title);
  new.industry_other := public.mask_profanity(new.industry_other);
  new.subindustry := public.mask_profanity(new.subindustry);
  return new;
end;
$$;

drop trigger if exists profile_work_mask_profanity on public.profile_work;
create trigger profile_work_mask_profanity
before insert or update
on public.profile_work
for each row
execute function public.trg_profile_work_mask_profanity();

-- catalogs
create or replace function public.trg_profession_catalog_mask_profanity()
returns trigger
language plpgsql
as $$
begin
  new.label := public.mask_profanity(new.label);
  return new;
end;
$$;

drop trigger if exists profession_catalog_mask_profanity on public.profession_catalog;
create trigger profession_catalog_mask_profanity
before insert or update
on public.profession_catalog
for each row
execute function public.trg_profession_catalog_mask_profanity();

create or replace function public.trg_industry_catalog_mask_profanity()
returns trigger
language plpgsql
as $$
begin
  new.label := public.mask_profanity(new.label);
  return new;
end;
$$;

drop trigger if exists industry_catalog_mask_profanity on public.industry_catalog;
create trigger industry_catalog_mask_profanity
before insert or update
on public.industry_catalog
for each row
execute function public.trg_industry_catalog_mask_profanity();

create or replace function public.trg_subindustry_catalog_mask_profanity()
returns trigger
language plpgsql
as $$
begin
  new.label := public.mask_profanity(new.label);
  return new;
end;
$$;

drop trigger if exists subindustry_catalog_mask_profanity on public.subindustry_catalog;
create trigger subindustry_catalog_mask_profanity
before insert or update
on public.subindustry_catalog
for each row
execute function public.trg_subindustry_catalog_mask_profanity();

-- 4) Optional: sanitize existing rows immediately
-- Uncomment if you want to cleanse already-stored profanity.
/*
update public.posts set body = public.mask_profanity(body);

update public.profiles
set full_name = public.mask_profanity(full_name),
    role_title = public.mask_profanity(role_title),
    industry_other = public.mask_profanity(industry_other),
    subindustry = public.mask_profanity(subindustry),
    skills = public.mask_profanity(skills),
    looking_for = public.mask_profanity(looking_for),
    can_help_with = public.mask_profanity(can_help_with),
    interested_in = public.mask_profanity(interested_in);

update public.profile_work
set role_title = public.mask_profanity(role_title),
    industry_other = public.mask_profanity(industry_other),
    subindustry = public.mask_profanity(subindustry);

update public.profession_catalog set label = public.mask_profanity(label);
update public.industry_catalog set label = public.mask_profanity(label);
update public.subindustry_catalog set label = public.mask_profanity(label);
*/

