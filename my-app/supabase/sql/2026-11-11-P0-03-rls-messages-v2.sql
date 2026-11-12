begin;

-- =============================================================================
-- M3-v2. RLS для messages + чистка chat_members/chats.
-- enable row level security — ПОСЛЕДНЕЙ строкой.
-- =============================================================================

-- 1) Вспомогательная функция: двусторонняя проверка блокировки
--    (только для своей пары — a или b должны быть текущим пользователем)
create or replace function public.is_blocked_pair(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_id_auth() in (a, b)
    and exists (
      select 1 from public.profile_blocks pb
      where (pb.owner_id = a and pb.blocked_profile_id = b)
         or (pb.owner_id = b and pb.blocked_profile_id = a)
    );
$$;

revoke all on function public.is_blocked_pair(uuid, uuid) from public, anon;
grant execute on function public.is_blocked_pair(uuid, uuid) to authenticated;

-- 2) Гранты messages: по факту из кода
revoke all on table public.messages from anon, authenticated;
grant select, delete on table public.messages to authenticated;
grant insert (chat_id, sender_id, content) on table public.messages to authenticated;
grant update (content) on table public.messages to authenticated;

-- 3) Политики messages (текущее из pg_policies → новое)

-- SELECT — исходное условие блокировки (owner = self, blocked = sender)
drop policy if exists messages_select_if_member on public.messages;
create policy messages_select_if_member
  on public.messages
  for select
  to authenticated
  using (
    exists (
      select 1 from public.chat_members cm
      where cm.chat_id = messages.chat_id
        and cm.user_id = public.current_profile_id_auth()
    )
    and not exists (
      select 1 from public.profile_blocks pb
      where pb.owner_id = public.current_profile_id_auth()
        and pb.blocked_profile_id = messages.sender_id
    )
  );

-- INSERT: отправитель = я, я участник чата, я не заблокирован,
--         получатель не заблокировал отправителя
drop policy if exists messages_insert_not_blocked on public.messages;
create policy messages_insert_member_not_blocked
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = public.current_profile_id_auth()
    and public.user_is_member_of_chat(chat_id)
    and exists (
      select 1 from public.profiles p
      where p.id = messages.sender_id
        and coalesce(p.is_blocked, false) = false
    )
    and not exists (
      select 1 from public.chat_members cm
      where cm.chat_id = messages.chat_id
        and cm.user_id <> messages.sender_id
        and public.is_blocked_pair(cm.user_id, messages.sender_id)
    )
  );

-- UPDATE: только свои сообщения, и остаюсь в чате
drop policy if exists messages_update_own on public.messages;
create policy messages_update_own
  on public.messages
  for update
  to authenticated
  using (sender_id = public.current_profile_id_auth())
  with check (
    sender_id = public.current_profile_id_auth()
    and public.user_is_member_of_chat(chat_id)
  );

-- DELETE: только свои
drop policy if exists messages_delete_own on public.messages;
create policy messages_delete_own
  on public.messages
  for delete
  to authenticated
  using (sender_id = public.current_profile_id_auth());

-- 4) Удаляем дырявые дублирующие политики chat_members/chats
drop policy if exists chat_members_insert_authenticated on public.chat_members;
drop policy if exists chat_members_insert_private on public.chat_members;
drop policy if exists chats_insert_authenticated on public.chats;

-- 5) chat_members: revoke insert, update — только колоночный грант на last_read_at
revoke insert on table public.chat_members from anon, authenticated;
revoke update on table public.chat_members from anon, authenticated;
grant update (last_read_at) on table public.chat_members to authenticated;

-- 6) Включаем RLS на messages
alter table public.messages enable row level security;

commit;
notify pgrst, 'reload schema';