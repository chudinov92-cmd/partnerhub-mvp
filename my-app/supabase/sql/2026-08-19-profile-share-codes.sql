-- Короткие ссылки на профиль: https://zeip.ru/p/<code>
-- Self-hosted Timeweb:
--   ssh root@186.246.2.104
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < /root/zeip/my-app/supabase/sql/2026-08-19-profile-share-codes.sql

create table if not exists public.profile_share_codes (
  code        text primary key,
  profile_id  uuid not null unique references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint profile_share_codes_code_format check (
    code ~ '^[23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz]{8}$'
  )
);

create index if not exists idx_profile_share_codes_profile_id
  on public.profile_share_codes (profile_id);

comment on table public.profile_share_codes is
  'Короткие коды для шеринга профиля (/p/<code> → /map?profile=uuid).';

alter table public.profile_share_codes enable row level security;

drop policy if exists profile_share_codes_select on public.profile_share_codes;
create policy profile_share_codes_select
  on public.profile_share_codes
  for select
  to anon, authenticated
  using (true);

-- Запись только через security definer RPC
drop policy if exists profile_share_codes_deny_write on public.profile_share_codes;
create policy profile_share_codes_deny_write
  on public.profile_share_codes
  for insert
  to anon, authenticated
  with check (false);

drop policy if exists profile_share_codes_deny_update on public.profile_share_codes;
create policy profile_share_codes_deny_update
  on public.profile_share_codes
  for update
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists profile_share_codes_deny_delete on public.profile_share_codes;
create policy profile_share_codes_deny_delete
  on public.profile_share_codes
  for delete
  to anon, authenticated
  using (false);

create or replace function public.get_or_create_profile_share_code(p_profile_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
  v_bytes bytea;
  v_i int;
  v_attempt int := 0;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_profile_id
      and p.deleted_at is null
  ) then
    raise exception 'profile not found';
  end if;

  select psc.code
  into v_code
  from public.profile_share_codes psc
  where psc.profile_id = p_profile_id;

  if v_code is not null then
    return v_code;
  end if;

  loop
    v_attempt := v_attempt + 1;
    if v_attempt > 24 then
      raise exception 'could not generate unique share code';
    end if;

    v_bytes := gen_random_bytes(8);
    v_code := '';
    for v_i in 0..7 loop
      v_code := v_code || substr(
        v_alphabet,
        (get_byte(v_bytes, v_i) % length(v_alphabet)) + 1,
        1
      );
    end loop;

    begin
      insert into public.profile_share_codes (code, profile_id)
      values (v_code, p_profile_id);
      return v_code;
    exception
      when unique_violation then
        select psc.code
        into v_code
        from public.profile_share_codes psc
        where psc.profile_id = p_profile_id;
        if v_code is not null then
          return v_code;
        end if;
    end;
  end loop;
end;
$$;

revoke all on function public.get_or_create_profile_share_code(uuid) from public;
grant execute on function public.get_or_create_profile_share_code(uuid) to authenticated;

comment on function public.get_or_create_profile_share_code(uuid) is
  'Ленивое создание 8-символьного кода для шеринга профиля. Только authenticated.';

create or replace function public.resolve_profile_share_code(p_code text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select psc.profile_id
  from public.profile_share_codes psc
  join public.profiles p on p.id = psc.profile_id
  where psc.code = trim(p_code)
    and p.deleted_at is null
  limit 1;
$$;

revoke all on function public.resolve_profile_share_code(text) from public;
grant execute on function public.resolve_profile_share_code(text) to anon, authenticated;

comment on function public.resolve_profile_share_code(text) is
  'UUID профиля по короткому коду /p/<code>. NULL если код не найден.';

notify pgrst, 'reload schema';
