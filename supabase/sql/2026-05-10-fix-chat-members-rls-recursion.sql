-- Исправление: infinite recursion detected in policy for relation "chat_members"
-- Причина: политика chat_members_select_if_member делала EXISTS (SELECT ... FROM chat_members ...),
-- что снова применяло RLS к той же таблице.
--
-- Решение: проверка членства в SECURITY DEFINER-функции (внутренний SELECT обходит RLS для роли-владельца).
-- Выполнить в Supabase SQL Editor от postgres/supabase_admin.

create or replace function public.user_is_member_of_chat(p_chat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_members cm
    where cm.chat_id = p_chat_id
      and cm.user_id = public.current_profile_id_auth()
  );
$$;

comment on function public.user_is_member_of_chat(uuid) is
  'Проверка членства в чате без рекурсии RLS на chat_members';

-- Владелец функции должен обходить RLS при чтении chat_members изнутри (postgres — суперпользователь).
alter function public.user_is_member_of_chat(uuid) owner to postgres;

grant execute on function public.user_is_member_of_chat(uuid) to authenticated;
grant execute on function public.user_is_member_of_chat(uuid) to service_role;

drop policy if exists chat_members_select_if_member on public.chat_members;

create policy chat_members_select_if_member
  on public.chat_members
  for select
  to authenticated
  using (public.user_is_member_of_chat(chat_id));

notify pgrst, 'reload schema';
