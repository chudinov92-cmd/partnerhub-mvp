-- RLS: разрешить создание личных чатов (INSERT в chats и chat_members).
-- Симптом: new row violates row-level security policy for table "chats"
-- Запуск: Supabase SQL Editor (полный скрипт целиком).

-- Нужна функция current_profile_id_auth (из docs/chat_select_policies.sql)
create or replace function public.current_profile_id_auth()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profiles p
  where p.auth_user_id = auth.uid()
  limit 1
$$;

grant execute on function public.current_profile_id_auth() to authenticated;

grant insert on table public.chats to authenticated;
grant insert on table public.chat_members to authenticated;

-- Создатель личного чата 1:1
drop policy if exists chats_insert_private_own on public.chats;
create policy chats_insert_private_own
  on public.chats
  for insert
  to authenticated
  with check (
    created_by = public.current_profile_id_auth()
    and coalesce(is_group, false) = false
  );

-- Участники: себя или собеседника в чат, который вы только что создали
drop policy if exists chat_members_insert_private on public.chat_members;
create policy chat_members_insert_private
  on public.chat_members
  for insert
  to authenticated
  with check (
    user_id = public.current_profile_id_auth()
    or exists (
      select 1
      from public.chats c
      where c.id = chat_members.chat_id
        and c.created_by = public.current_profile_id_auth()
        and coalesce(c.is_group, false) = false
    )
  );

notify pgrst, 'reload schema';
