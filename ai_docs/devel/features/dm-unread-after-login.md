# Непрочитанные ЛС после входа

## Проблема
Счётчик `unreadByUser` жил только в React state и увеличивался через Realtime, если пользователь уже был в сессии. Сообщения, пришедшие пока пользователь не авторизован, после логина показывали превью в списке, но без красного бейджа.

## Решение
- `chat_members.last_read_at` — момент последнего просмотра чата.
- RPC `get_dm_unread_counts(p_profile_id)` — подсчёт входящих с `created_at > last_read_at`.
- При логине: `loadDmUnreadCounts` в `page.tsx`.
- При открытии чата / входящем в открытом чате: `markChatAsRead`.

## SQL
`my-app/supabase/sql/2026-05-26-chat-members-last-read.sql` — выполнить в Supabase SQL Editor на prod.

## Backfill
`last_read_at` = время последнего **исходящего** сообщения участника в чате; если не писал — `NULL` (все входящие непрочитанные до первого открытия).

## Деплой
1. SQL на Supabase
2. `git push` + на VPS: `bash /root/zeip/my-app/deploy/timeweb/deploy-app.sh`
