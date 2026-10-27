-- Email о непрочитанном ЛС: peer_profile_id для deeplink /map?chat=<id>.
-- Запуск: Supabase SQL Editor (полный скрипт целиком).
-- Важно: меняется тип возврата — сначала DROP, иначе 42P13.

drop function if exists public.get_profiles_for_message_email();

create function public.get_profiles_for_message_email()
returns table (
  profile_id uuid,
  auth_user_id uuid,
  peer_profile_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (p.id)
    p.id as profile_id,
    p.auth_user_id,
    cm_other.user_id as peer_profile_id
  from public.profiles p
  join public.chat_members cm_me
    on cm_me.user_id = p.id
  join public.chat_members cm_other
    on cm_other.chat_id = cm_me.chat_id
   and cm_other.user_id <> cm_me.user_id
  join public.messages m
    on m.chat_id = cm_me.chat_id
   and m.sender_id = cm_other.user_id
   and m.created_at > coalesce(cm_me.last_read_at, '1970-01-01'::timestamptz)
  where p.auth_user_id is not null
    and p.auth_user_id <> 'd469c17a-4756-45a3-a1a6-0487b7a8a7e0'::uuid
    and (
      p.last_message_email_at is null
      or p.last_message_email_at < now() - interval '24 hours'
    )
    and not exists (
      select 1
      from public.push_subscriptions ps
      where ps.profile_id = p.id
    )
  order by p.id, m.created_at desc;
$$;

revoke all on function public.get_profiles_for_message_email() from public;
grant execute on function public.get_profiles_for_message_email() to service_role;

comment on function public.get_profiles_for_message_email() is
  'Профили для fallback email о непрочитанных ЛС: peer_profile_id — отправитель последнего непрочитанного';

notify pgrst, 'reload schema';
