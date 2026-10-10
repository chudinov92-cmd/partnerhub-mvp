-- Исключить аккаунт support@zeip.ru из fallback email-рассылки о непрочитанных ЛС.
-- Запуск: Supabase SQL Editor или psql на self-hosted Timeweb.

create or replace function public.get_profiles_for_message_email()
returns table (profile_id uuid, auth_user_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select distinct p.id as profile_id, p.auth_user_id
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
    -- исключаем аккаунт support@zeip.ru
    and p.auth_user_id <> 'd469c17a-4756-45a3-a1a6-0487b7a8a7e0'::uuid
    and (
      p.last_message_email_at is null
      or p.last_message_email_at < now() - interval '24 hours'
    )
    and not exists (
      select 1
      from public.push_subscriptions ps
      where ps.profile_id = p.id
    );
$$;

revoke all on function public.get_profiles_for_message_email() from public;
grant execute on function public.get_profiles_for_message_email() to service_role;

comment on function public.get_profiles_for_message_email() is
  'Профили для fallback email о непрочитанных ЛС: нет push-подписки, cooldown 24ч, без support@zeip.ru';

notify pgrst, 'reload schema';
