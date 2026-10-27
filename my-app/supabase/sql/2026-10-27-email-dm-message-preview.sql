-- Email о непрочитанном ЛС: текст последнего сообщения, имя и профессия отправителя,
-- кнопка «Открыть чат», лимит 24 ч на пару «получатель -> отправитель».
-- Запуск: Supabase SQL Editor (полный скрипт целиком) или через deploy/timeweb/deploy-app.sh.
-- Важно: меняется тип возврата — сначала DROP, иначе 42P13.

-- 1) Лог отправленных писем по паре (получатель, отправитель), чтобы письмо от одного и того же
--    собеседника уходило не чаще 1 раза в 24 часа.
create table if not exists public.message_email_log (
  profile_id uuid not null,
  peer_profile_id uuid not null,
  sent_at timestamptz not null default now(),
  primary key (profile_id, peer_profile_id)
);

comment on table public.message_email_log is
  'Лог fallback email о непрочитанных ЛС: одно письмо на пару (получатель, отправитель) не чаще раза в 24 часа';

create index if not exists idx_message_email_log_sent_at
  on public.message_email_log (sent_at desc);

alter table public.message_email_log enable row level security;

revoke all on table public.message_email_log from public;
revoke all on table public.message_email_log from authenticated;
revoke all on table public.message_email_log from anon;

grant select, insert, update, delete on table public.message_email_log to service_role;

-- 2) Пересоздаём функцию с новым набором возвращаемых полей.
drop function if exists public.get_profiles_for_message_email();

create function public.get_profiles_for_message_email()
returns table (
  profile_id uuid,
  auth_user_id uuid,
  peer_profile_id uuid,
  sender_name text,
  sender_role_title text,
  message_content text,
  message_created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (p.id)
    p.id as profile_id,
    p.auth_user_id,
    cm_other.user_id as peer_profile_id,
    coalesce(nullif(trim(sp.full_name), ''), 'Пользователь') as sender_name,
    nullif(trim(sp.role_title), '') as sender_role_title,
    m.content as message_content,
    m.created_at as message_created_at
  from public.profiles p
  join public.chat_members cm_me
    on cm_me.user_id = p.id
  join public.chat_members cm_other
    on cm_other.chat_id = cm_me.chat_id
   and cm_other.user_id <> cm_me.user_id
  join public.profiles sp
    on sp.id = cm_other.user_id
  join public.messages m
    on m.chat_id = cm_me.chat_id
   and m.sender_id = cm_other.user_id
   and m.created_at > coalesce(cm_me.last_read_at, '1970-01-01'::timestamptz)
  where p.auth_user_id is not null
    and p.auth_user_id <> 'd469c17a-4756-45a3-a1a6-0487b7a8a7e0'::uuid
    and not exists (
      select 1
      from public.push_subscriptions ps
      where ps.profile_id = p.id
    )
    -- лимит: не более одного письма от конкретного отправителя за 24 часа
    and not exists (
      select 1
      from public.message_email_log mel
      where mel.profile_id = p.id
        and mel.peer_profile_id = cm_other.user_id
        and mel.sent_at > now() - interval '24 hours'
    )
  order by p.id, m.created_at desc;
$$;

revoke all on function public.get_profiles_for_message_email() from public;
grant execute on function public.get_profiles_for_message_email() to service_role;

comment on function public.get_profiles_for_message_email() is
  'Профили для fallback email о непрочитанных ЛС: отправитель последнего непрочитанного, его имя/профессия/текст, лимит 24ч на пару';

notify pgrst, 'reload schema';