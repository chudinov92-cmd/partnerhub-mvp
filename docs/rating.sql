-- Rating points (integer) stored in public.profiles.rating_count
-- Rules:
-- - +1 per filled profile field (recalculated on profile save; delta applied)
-- - +1 for geo set (once, when first active location appears)
-- - +1 for sending a message (once per day, MSK): posts OR messages
-- - +1 for replying to an incoming message (once per day, MSK): messages only
--
-- Run in Supabase SQL editor.

create extension if not exists pgcrypto;

-- 1) State table to avoid double counting profile completeness / geo
create table if not exists public.rating_state (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  filled_fields int not null default 0,
  geo_awarded boolean not null default false,
  updated_at timestamptz not null default now()
);

-- 2) Daily events (send/reply) to enforce "once per day"
create table if not exists public.rating_daily_events (
  id bigserial primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('sent_message','replied_message')),
  day_msk date not null,
  created_at timestamptz not null default now(),
  unique (profile_id, event_type, day_msk)
);

-- Helper: MSK day from timestamptz
create or replace function public.day_msk(ts timestamptz)
returns date
language sql
immutable
as $$
  select (ts at time zone 'Europe/Moscow')::date;
$$;

-- Helper: count filled fields in profiles (MVP rules)
create or replace function public.count_filled_profile_fields(p public.profiles)
returns int
language plpgsql
stable
as $$
declare
  n int := 0;
begin
  if coalesce(nullif(btrim(p.full_name),''), '') <> '' then n := n + 1; end if;
  if coalesce(nullif(btrim(p.country),''), '') <> '' then n := n + 1; end if;
  if coalesce(nullif(btrim(p.city),''), '') <> '' then n := n + 1; end if;

  if coalesce(nullif(btrim(p.role_title),''), '') <> '' then n := n + 1; end if;

  if coalesce(nullif(btrim(p.industry),''), '') <> '' then n := n + 1; end if;
  if p.industry = 'Другое' and coalesce(nullif(btrim(p.industry_other),''), '') <> '' then
    n := n + 1;
  end if;

  if coalesce(nullif(btrim(p.subindustry),''), '') <> '' then n := n + 1; end if;

  if p.experience_years is not null then n := n + 1; end if;

  if coalesce(nullif(btrim(p.skills),''), '') <> '' then n := n + 1; end if;
  if coalesce(nullif(btrim(p.looking_for),''), '') <> '' then n := n + 1; end if;
  if coalesce(nullif(btrim(p.resources),''), '') <> '' then n := n + 1; end if;
  if coalesce(nullif(btrim(p.can_help_with),''), '') <> '' then n := n + 1; end if;
  if coalesce(nullif(btrim(p.interested_in),''), '') <> '' then n := n + 1; end if;

  return n;
end;
$$;

-- Apply profile-related rating changes (delta + geo once)
drop function if exists public.apply_profile_rating(uuid);
create or replace function public.apply_profile_rating(p_profile_id uuid)
returns void
language plpgsql
as $$
declare
  p public.profiles%rowtype;
  prev_filled int := 0;
  prev_geo boolean := false;
  now_filled int := 0;
  delta int := 0;
  has_geo boolean := false;
begin
  select * into p from public.profiles where id = p_profile_id;
  if not found then
    return;
  end if;

  select filled_fields, geo_awarded
    into prev_filled, prev_geo
    from public.rating_state
    where rating_state.profile_id = p_profile_id;

  if not found then
    prev_filled := 0;
    prev_geo := false;
    insert into public.rating_state(profile_id, filled_fields, geo_awarded)
    values (p_profile_id, 0, false)
    on conflict (profile_id) do nothing;
  end if;

  now_filled := public.count_filled_profile_fields(p);
  delta := now_filled - prev_filled;
  if delta <> 0 then
    update public.profiles
      set rating_count = coalesce(rating_count, 0) + delta
    where id = p_profile_id;
  end if;

  select exists(
    select 1
    from public.locations l
    where l.user_id = p_profile_id and l.is_active = true
  ) into has_geo;

  if has_geo and not prev_geo then
    update public.profiles
      set rating_count = coalesce(rating_count, 0) + 1
    where id = p_profile_id;
    prev_geo := true;
  end if;

  update public.rating_state
    set filled_fields = now_filled,
        geo_awarded = prev_geo,
        updated_at = now()
  where rating_state.profile_id = p_profile_id;
end;
$$;

-- Daily award helpers
drop function if exists public.award_daily(uuid, text, timestamptz);
create or replace function public.award_daily(p_profile_id uuid, p_event_type text, p_ts timestamptz)
returns void
language plpgsql
as $$
declare
  d date;
  new_id bigint;
begin
  d := public.day_msk(p_ts);
  insert into public.rating_daily_events(profile_id, event_type, day_msk)
  values (p_profile_id, p_event_type, d)
  on conflict (profile_id, event_type, day_msk) do nothing
  returning id into new_id;

  if new_id is not null then
    update public.profiles
      set rating_count = coalesce(rating_count, 0) + 1
    where id = p_profile_id;
  end if;
end;
$$;

-- 3) Triggers

-- profiles: recalc on save
create or replace function public.trg_profiles_apply_rating()
returns trigger
language plpgsql
as $$
begin
  perform public.apply_profile_rating(new.id);
  return new;
end;
$$;

drop trigger if exists profiles_apply_rating on public.profiles;
create trigger profiles_apply_rating
after insert or update of
  full_name, country, city,
  role_title, industry, industry_other, subindustry,
  experience_years, skills, looking_for, resources, can_help_with, interested_in
on public.profiles
for each row
execute function public.trg_profiles_apply_rating();

-- locations: geo +1 once when first active appears
create or replace function public.trg_locations_apply_rating()
returns trigger
language plpgsql
as $$
begin
  perform public.apply_profile_rating(new.user_id);
  return new;
end;
$$;

drop trigger if exists locations_apply_rating on public.locations;
create trigger locations_apply_rating
after insert or update of is_active, lat, lng
on public.locations
for each row
execute function public.trg_locations_apply_rating();

-- posts: daily send +1
create or replace function public.trg_posts_award_daily_send()
returns trigger
language plpgsql
as $$
begin
  perform public.award_daily(new.author_id, 'sent_message', new.created_at);
  return new;
end;
$$;

drop trigger if exists posts_award_daily_send on public.posts;
create trigger posts_award_daily_send
after insert
on public.posts
for each row
execute function public.trg_posts_award_daily_send();

-- messages: daily send +1, daily reply +1
create or replace function public.trg_messages_award_daily()
returns trigger
language plpgsql
as $$
declare
  prev_sender uuid;
begin
  -- sent (once per day)
  perform public.award_daily(new.sender_id, 'sent_message', new.created_at);

  -- reply (once per day): previous message in chat is from other user
  select m.sender_id
    into prev_sender
  from public.messages m
  where m.chat_id = new.chat_id
    and m.created_at < new.created_at
  order by m.created_at desc
  limit 1;

  if prev_sender is not null and prev_sender <> new.sender_id then
    perform public.award_daily(new.sender_id, 'replied_message', new.created_at);
  end if;

  return new;
end;
$$;

drop trigger if exists messages_award_daily on public.messages;
create trigger messages_award_daily
after insert
on public.messages
for each row
execute function public.trg_messages_award_daily();

