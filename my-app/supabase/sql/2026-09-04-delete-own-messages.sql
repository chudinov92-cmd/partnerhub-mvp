-- Автор может удалить своё сообщение в ЛС (messages) и свой пост в общем чате (posts).
-- Запуск: Supabase SQL Editor целиком, либо через deploy-app.sh.
-- Self-hosted:
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < /root/zeip/my-app/supabase/sql/2026-09-04-delete-own-messages.sql

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

grant delete on table public.messages to authenticated;
grant delete on table public.posts to authenticated;

-- Realtime DELETE для ЛС: в payload.old нужны chat_id / sender_id / content,
-- иначе подписчик видит только PK.
alter table public.messages replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- RLS: messages — удаляет только отправитель, не заблокированный
-- ---------------------------------------------------------------------------

drop policy if exists messages_delete_own on public.messages;

create policy messages_delete_own
on public.messages
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = messages.sender_id
      and p.auth_user_id = auth.uid()
      and coalesce(p.is_blocked, false) = false
  )
);

-- ---------------------------------------------------------------------------
-- RLS: posts — удаляет автор (даже без Pro+), не заблокированный.
-- Админский posts_admin_delete остаётся отдельной политикой (OR).
-- ---------------------------------------------------------------------------

drop policy if exists posts_delete_author on public.posts;

create policy posts_delete_author
on public.posts
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = posts.author_id
      and p.auth_user_id = auth.uid()
      and coalesce(p.is_blocked, false) = false
  )
);

notify pgrst, 'reload schema';
