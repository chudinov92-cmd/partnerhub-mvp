-- Непрочитанные личные сообщения: last_read_at на chat_members + RPC подсчёта.
-- Симптом: сообщение пришло, пока пользователь не в сети — после входа нет бейджа
-- (счётчик жил только в памяти и рос только через Realtime).
-- Запуск: Supabase SQL Editor (весь файл целиком).

-- 1) Колонка «когда участник последний раз открывал чат»
alter table public.chat_members
  add column if not exists last_read_at timestamptz;

comment on column public.chat_members.last_read_at is
  'Момент последнего просмотра чата участником; входящие с created_at > last_read_at — непрочитанные';

-- 2) Backfill: для каждого участника — время его последнего исходящего в чате.
--    Если пользователь ещё не писал в чат — NULL → все входящие считаются непрочитанными до первого открытия.
update public.chat_members cm
set last_read_at = sent.last_at
from (
  select m.chat_id, m.sender_id as user_id, max(m.created_at) as last_at
  from public.messages m
  group by m.chat_id, m.sender_id
) sent
where sent.chat_id = cm.chat_id
  and sent.user_id = cm.user_id
  and cm.last_read_at is null;

-- 3) Подсчёт непрочитанных по собеседникам (profile id)
create or replace function public.get_dm_unread_counts(p_profile_id uuid)
returns table (peer_profile_id uuid, unread_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select cm_other.user_id as peer_profile_id,
         count(m.id)::bigint as unread_count
  from public.chat_members cm_me
  join public.chat_members cm_other
    on cm_other.chat_id = cm_me.chat_id
   and cm_other.user_id <> cm_me.user_id
  join public.messages m
    on m.chat_id = cm_me.chat_id
   and m.sender_id = cm_other.user_id
   and m.created_at > coalesce(cm_me.last_read_at, '1970-01-01'::timestamptz)
  where cm_me.user_id = p_profile_id
  group by cm_other.user_id
  having count(m.id) > 0;
$$;

grant execute on function public.get_dm_unread_counts(uuid) to authenticated;

comment on function public.get_dm_unread_counts(uuid) is
  'Количество непрочитанных входящих ЛС по peer profile id для p_profile_id';

-- 4) RLS: участник может обновить только свою строку (last_read_at при открытии чата)
grant update on table public.chat_members to authenticated;

drop policy if exists chat_members_update_own on public.chat_members;

create policy chat_members_update_own
  on public.chat_members
  for update
  to authenticated
  using (user_id = public.current_profile_id_auth())
  with check (user_id = public.current_profile_id_auth());

notify pgrst, 'reload schema';
