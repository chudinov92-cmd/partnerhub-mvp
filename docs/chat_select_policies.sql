-- Fix missing SELECT policies for chat tables.
-- Symptoms: UI shows 0 posts/messages, while counts in DB are > 0.
-- Run in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- Ensure privileges exist (RLS still applies after GRANT).
grant select on table public.posts to anon, authenticated;
grant select on table public.messages to authenticated;
grant select on table public.chats to authenticated;
grant select on table public.chat_members to authenticated;

-- Helper: current user's profile id (from profiles.auth_user_id)
create or replace function public.current_profile_id_auth()
returns uuid
language sql
stable
as $$
  select p.id
  from public.profiles p
  where p.auth_user_id = auth.uid()
  limit 1
$$;

-- POSTS (general chat): readable by everyone.
-- If RLS is enabled on posts, we need an explicit select policy.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'posts'
      and policyname = 'posts_select_all'
  ) then
    create policy posts_select_all
      on public.posts
      for select
      using (true);
  end if;
end $$;

-- MESSAGES (personal chats): readable only by chat members.
-- Current user is identified via auth.uid() -> profiles.id -> chat_members.user_id.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'messages'
      and policyname = 'messages_select_if_member'
  ) then
    create policy messages_select_if_member
      on public.messages
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.chat_members cm
          where cm.chat_id = messages.chat_id
            and cm.user_id = public.current_profile_id_auth()
        )
      );
  end if;
end $$;

-- CHAT_MEMBERS: readable only if current user is a member of the same chat.
-- ВАЖНО: нельзя в USING делать SELECT из chat_members — бесконечная рекурсия RLS.
-- Используйте функцию user_is_member_of_chat(uuid); см. supabase/sql/2026-05-10-fix-chat-members-rls-recursion.sql
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'chat_members'
      and policyname = 'chat_members_select_if_member'
  ) then
    create policy chat_members_select_if_member
      on public.chat_members
      for select
      to authenticated
      using (public.user_is_member_of_chat(chat_id));
  end if;
end $$;

-- CHATS: readable only if current user is a member of the chat.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'chats'
      and policyname = 'chats_select_if_member'
  ) then
    create policy chats_select_if_member
      on public.chats
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.chat_members cm
          where cm.chat_id = chats.id
            and cm.user_id = public.current_profile_id_auth()
        )
      );
  end if;
end $$;

