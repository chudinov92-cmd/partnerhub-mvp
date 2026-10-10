-- Дубли 1:1 чатов: диагностика + слияние в один чат с последней активностью.
-- Запуск: Supabase SQL Editor (полный скрипт целиком).
-- Перед продом: сначала выполните только SELECT в блоке «Диагностика» и проверьте строки.

-- =============================================================================
-- Диагностика: пары пользователей с несколькими личными чатами
-- =============================================================================

select
  least(cm1.user_id, cm2.user_id) as user_a,
  greatest(cm1.user_id, cm2.user_id) as user_b,
  c.id as chat_id,
  (
    select max(m.created_at)
    from public.messages m
    where m.chat_id = c.id
  ) as last_message_at,
  (
    select count(*)
    from public.messages m
    where m.chat_id = c.id
  ) as message_count
from public.chat_members cm1
inner join public.chat_members cm2
  on cm2.chat_id = cm1.chat_id
 and cm2.user_id <> cm1.user_id
inner join public.chats c on c.id = cm1.chat_id
where coalesce(c.is_group, false) = false
  and cm1.user_id < cm2.user_id
  and exists (
    select 1
    from public.chat_members x1
    inner join public.chat_members x2 on x2.chat_id = x1.chat_id and x2.user_id <> x1.user_id
    inner join public.chats xc on xc.id = x1.chat_id
    where coalesce(xc.is_group, false) = false
      and least(x1.user_id, x2.user_id) = least(cm1.user_id, cm2.user_id)
      and greatest(x1.user_id, x2.user_id) = greatest(cm1.user_id, cm2.user_id)
    group by least(x1.user_id, x2.user_id), greatest(x1.user_id, x2.user_id)
    having count(distinct x1.chat_id) > 1
  )
order by user_a, user_b, last_message_at desc nulls last;

-- =============================================================================
-- Слияние дублей
-- =============================================================================

do $$
declare
  grp record;
  keep_chat uuid;
  dup_chat uuid;
begin
  for grp in
    select
      least(cm1.user_id, cm2.user_id) as user_a,
      greatest(cm1.user_id, cm2.user_id) as user_b
    from public.chat_members cm1
    inner join public.chat_members cm2
      on cm2.chat_id = cm1.chat_id
     and cm2.user_id <> cm1.user_id
    inner join public.chats c on c.id = cm1.chat_id
    where coalesce(c.is_group, false) = false
    group by least(cm1.user_id, cm2.user_id), greatest(cm1.user_id, cm2.user_id)
    having count(distinct c.id) > 1
  loop
    select pc.chat_id
      into keep_chat
    from (
      select
        c.id as chat_id,
        (
          select max(m.created_at)
          from public.messages m
          where m.chat_id = c.id
        ) as last_at
      from public.chat_members cm1
      inner join public.chat_members cm2
        on cm2.chat_id = cm1.chat_id
       and cm2.user_id <> cm1.user_id
      inner join public.chats c on c.id = cm1.chat_id
      where coalesce(c.is_group, false) = false
        and least(cm1.user_id, cm2.user_id) = grp.user_a
        and greatest(cm1.user_id, cm2.user_id) = grp.user_b
    ) pc
    order by pc.last_at desc nulls last, pc.chat_id
    limit 1;

    for dup_chat in
      select pc.chat_id
      from (
        select c.id as chat_id
        from public.chat_members cm1
        inner join public.chat_members cm2
          on cm2.chat_id = cm1.chat_id
         and cm2.user_id <> cm1.user_id
        inner join public.chats c on c.id = cm1.chat_id
        where coalesce(c.is_group, false) = false
          and least(cm1.user_id, cm2.user_id) = grp.user_a
          and greatest(cm1.user_id, cm2.user_id) = grp.user_b
      ) pc
      where pc.chat_id <> keep_chat
    loop
      update public.messages
      set chat_id = keep_chat
      where chat_id = dup_chat;

      delete from public.chat_members
      where chat_id = dup_chat;

      delete from public.chats
      where id = dup_chat;
    end loop;
  end loop;
end;
$$;

notify pgrst, 'reload schema';
