-- Создание/поиск личного чата 1:1 без RLS на INSERT (SECURITY DEFINER).
-- Симптом: new row violates row-level security policy for table "chats"
-- Запуск: Supabase SQL Editor (полный скрипт целиком).

create or replace function public.ensure_private_chat(p_peer_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid;
  v_chat_id uuid;
begin
  select id into v_me from public.profiles where auth_user_id = auth.uid();
  if v_me is null then
    raise exception 'not_authorized';
  end if;

  if p_peer_profile_id is null or p_peer_profile_id = v_me then
    raise exception 'invalid_peer';
  end if;

  if not exists (select 1 from public.profiles where id = p_peer_profile_id) then
    raise exception 'peer_not_found';
  end if;

  select cm1.chat_id into v_chat_id
  from public.chat_members cm1
  inner join public.chat_members cm2 on cm2.chat_id = cm1.chat_id
  inner join public.chats c on c.id = cm1.chat_id
  where cm1.user_id = v_me
    and cm2.user_id = p_peer_profile_id
    and coalesce(c.is_group, false) = false
  limit 1;

  if v_chat_id is not null then
    return v_chat_id;
  end if;

  insert into public.chats (is_group, title, created_by)
  values (false, null, v_me)
  returning id into v_chat_id;

  insert into public.chat_members (chat_id, user_id)
  values
    (v_chat_id, v_me),
    (v_chat_id, p_peer_profile_id);

  return v_chat_id;
end;
$$;

grant execute on function public.ensure_private_chat(uuid) to authenticated;

comment on function public.ensure_private_chat(uuid) is
  'Найти или создать личный чат с p_peer_profile_id для текущего пользователя';

notify pgrst, 'reload schema';
