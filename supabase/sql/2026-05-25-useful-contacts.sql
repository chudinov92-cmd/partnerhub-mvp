-- Полезные контакты: пара пользователей с перепиской «сообщение + ответ» (один раз на пару).
-- Запуск: Supabase SQL Editor (полный скрипт целиком) или deploy-app.sh на VPS.

-- 1. Таблица установленных пар
create table if not exists public.useful_contact_pairs (
  profile_low uuid not null references public.profiles(id) on delete cascade,
  profile_high uuid not null references public.profiles(id) on delete cascade,
  chat_id uuid not null references public.chats(id) on delete cascade,
  established_at timestamptz not null default now(),
  primary key (profile_low, profile_high),
  check (profile_low < profile_high)
);

create index if not exists idx_useful_contact_pairs_profile_low
  on public.useful_contact_pairs (profile_low);

create index if not exists idx_useful_contact_pairs_profile_high
  on public.useful_contact_pairs (profile_high);

alter table public.useful_contact_pairs enable row level security;

drop policy if exists useful_contact_pairs_select_all on public.useful_contact_pairs;
create policy useful_contact_pairs_select_all
  on public.useful_contact_pairs
  for select
  to anon, authenticated
  using (true);

-- 2. Триггер: фиксация пары при первом ответе в личном чате
create or replace function public.try_register_useful_contact_pair()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_group boolean;
  v_support_id uuid;
  v_other_id uuid;
  v_low uuid;
  v_high uuid;
begin
  select coalesce(c.is_group, false) into v_is_group
  from public.chats c
  where c.id = new.chat_id;

  if v_is_group then
    return new;
  end if;

  select p.id into v_support_id
  from public.profiles p
  where p.auth_user_id = 'd469c17a-4756-45a3-a1a6-0487b7a8a7e0';

  select cm.user_id into v_other_id
  from public.chat_members cm
  where cm.chat_id = new.chat_id
    and cm.user_id <> new.sender_id
  limit 1;

  if v_other_id is null then
    return new;
  end if;

  if v_support_id is not null
    and (new.sender_id = v_support_id or v_other_id = v_support_id) then
    return new;
  end if;

  if not exists (
    select 1
    from public.messages m
    where m.chat_id = new.chat_id
      and m.sender_id <> new.sender_id
      and m.created_at < new.created_at
  ) then
    return new;
  end if;

  if new.sender_id < v_other_id then
    v_low := new.sender_id;
    v_high := v_other_id;
  else
    v_low := v_other_id;
    v_high := new.sender_id;
  end if;

  insert into public.useful_contact_pairs (profile_low, profile_high, chat_id)
  values (v_low, v_high, new.chat_id)
  on conflict (profile_low, profile_high) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_messages_useful_contact on public.messages;
create trigger trg_messages_useful_contact
  after insert on public.messages
  for each row
  execute function public.try_register_useful_contact_pair();

-- 3. Backfill существующих диалогов
insert into public.useful_contact_pairs (profile_low, profile_high, chat_id, established_at)
select
  cp.profile_low,
  cp.profile_high,
  cp.chat_id,
  cp.established_at
from (
  select distinct on (pairs.profile_low, pairs.profile_high)
    pairs.profile_low,
    pairs.profile_high,
    pairs.chat_id,
    pairs.established_at
  from (
    select
      least(cm.user_id, cm2.user_id) as profile_low,
      greatest(cm.user_id, cm2.user_id) as profile_high,
      c.id as chat_id,
      m_reply.created_at as established_at
    from public.chats c
    join public.chat_members cm on cm.chat_id = c.id
    join public.chat_members cm2 on cm2.chat_id = c.id and cm2.user_id <> cm.user_id
    join public.messages m_reply on m_reply.chat_id = c.id
    where coalesce(c.is_group, false) = false
      and exists (
        select 1
        from public.messages m_prior
        where m_prior.chat_id = c.id
          and m_prior.sender_id <> m_reply.sender_id
          and m_prior.created_at < m_reply.created_at
      )
  ) pairs
  where not exists (
    select 1
    from public.profiles sp
    where sp.auth_user_id = 'd469c17a-4756-45a3-a1a6-0487b7a8a7e0'
      and (sp.id = pairs.profile_low or sp.id = pairs.profile_high)
  )
  order by pairs.profile_low, pairs.profile_high, pairs.established_at asc
) cp
on conflict (profile_low, profile_high) do nothing;

-- 4. RPC: число пользователей с полезным контактом по городу
create or replace function public.get_useful_contacts_users_count(p_city text)
returns bigint
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_city text := btrim(coalesce(p_city, ''));
begin
  if v_city = 'Россия' then
    return (
      select count(*)::bigint
      from public.profiles p
      where p.city is not null
        and btrim(p.city) <> ''
        and p.city <> 'Россия'
        and exists (
          select 1
          from public.useful_contact_pairs ucp
          where ucp.profile_low = p.id or ucp.profile_high = p.id
        )
    );
  end if;

  return (
    select count(*)::bigint
    from public.profiles p
    where p.city = v_city
      and exists (
        select 1
        from public.useful_contact_pairs ucp
        where ucp.profile_low = p.id or ucp.profile_high = p.id
      )
  );
end;
$$;

grant execute on function public.get_useful_contacts_users_count(text) to anon, authenticated;
