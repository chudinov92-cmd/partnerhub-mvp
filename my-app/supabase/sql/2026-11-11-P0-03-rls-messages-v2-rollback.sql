-- =============================================================================
-- M3-v2-ROLLBACK. Вернуть состояние как было.
-- Применять только после pg_dump --schema-only.
-- =============================================================================
alter table public.messages disable row level security;

drop policy if exists messages_select_if_member on public.messages;
drop policy if exists messages_insert_member_not_blocked on public.messages;
drop policy if exists messages_update_own on public.messages;
drop policy if exists messages_delete_own on public.messages;

-- Вернуть исходный грант (табличный, все колонки)
grant all on table public.messages to anon, authenticated;

-- Вернуть гранты chat_members (табличные)
grant select, insert, update, delete on table public.chat_members to anon, authenticated;

-- Удалить вспомогательную функцию
drop function if exists public.is_blocked_pair(uuid, uuid);

notify pgrst, 'reload schema';