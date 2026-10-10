# Удаление своих сообщений (ЛС и общий чат)

## Цель

Автор может убрать своё сообщение из личного чата и свой пост из общего чата. Чужие сообщения не удаляются. Обращения в поддержку (`__APPEAL__`) не удаляются из UI — это тикет.

## Правила

| Где | Кто | Что происходит |
|---|---|---|
| ЛС (`messages`) | отправитель, не заблокирован | hard delete; у собеседника пропадает через Realtime |
| Общий чат (`posts`) | автор, не заблокирован (тариф не обязателен) | hard delete; комментарии каскадом |
| Админка | `posts_admin_delete` | без изменений |

Подтверждение: `window.confirm` перед удалением.

## Код

| Файл | Назначение |
|---|---|
| [`chatService.ts`](../../../my-app/src/services/chatService.ts) | `deleteMessage`, `fetchLatestMessageMeta`, Realtime DELETE |
| [`feedService.ts`](../../../my-app/src/services/feedService.ts) | `deletePost` |
| [`useChat.ts`](../../../my-app/src/hooks/useChat.ts) | убрать сообщение, обновить превью и unread |
| [`map/page.tsx`](../../../my-app/src/app/map/page.tsx) | кнопки «Удалить» рядом с «Изменить» |

## SQL

[`my-app/supabase/sql/2026-09-04-delete-own-messages.sql`](../../../my-app/supabase/sql/2026-09-04-delete-own-messages.sql)

- RLS `messages_delete_own`, `posts_delete_author`
- `GRANT DELETE` для `authenticated`
- `REPLICA IDENTITY FULL` на `messages` (иначе Realtime DELETE отдаёт только PK)

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
ssh root@186.246.2.104
docker exec -i supabase-db psql -U supabase_admin -d postgres \
  < /root/zeip/my-app/supabase/sql/2026-09-04-delete-own-messages.sql
```

Либо целиком в SQL Editor Supabase.

## Проверка

1. Pro+: свой пост в общем чате → «Удалить» → пост исчезает у себя и после поллинга у других.
2. Своё ЛС → «Удалить» → пузырь пропадает; превью в списке чатов берёт предыдущее сообщение.
3. Чужое сообщение: кнопки нет.
4. Обращение в поддержку: кнопки «Изменить» / «Удалить» нет.
