-- RLS: разрешить создание личных чатов (INSERT в chats и chat_members).
-- Симптом: new row violates row-level security policy for table "chats"
-- Запуск: Supabase SQL Editor (полный скрипт целиком).
--
-- ВНИМАНИЕ (2026-11-12): эта миграция больше не создаёт INSERT-политики
-- и не выдаёт grant insert на chats/chat_members. Чаты создаются только
-- через RPC ensure_private_chat (security definer). Политики удалены,
-- grant insert отозваны — это исправление отката безопасности.

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

-- ВНИМАНИЕ: INSERT в чаты только через RPC ensure_private_chat (security definer).
-- Ниже — только для обратной совместимости (функция current_profile_id_auth).
-- Политики и grant insert удалены, чтобы предотвратить прямой INSERT в таблицы.

revoke insert on table public.chats from authenticated;
revoke insert on table public.chat_members from authenticated;
drop policy if exists chats_insert_private_own on public.chats;
drop policy if exists chat_members_insert_private on public.chat_members;

notify pgrst, 'reload schema';
