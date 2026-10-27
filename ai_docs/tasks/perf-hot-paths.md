# Задача: perf hot paths (`/map`, БД, сессия)

Статус: реализовано в репозитории. SQL на стенде — применить вручную.

## Фазы

- [x] **Фаза 1** — memo, стабильные колбэки, diff маркеров, умный rAF, inset из god-hook
- [x] **Фаза 2** — откат к исходным HTML-пинам (`fetchProfilesForMap(50)` + `fetchActiveLocations`); viewport/кластеры сняты
- [x] **Фаза 3** — SQL-индексы + `get_chat_last_messages` (файл в репо; sidebar на RPC)
- [x] **Фаза 4** — realtime filter по `chat_id` + fallback нового чата; recommended через viewport RPC
- [x] **Фаза 5** — dedup getUser/TOKEN_REFRESHED, last_seen skip 45s, feed poll hidden, Fuse cache, daily-ping, admin cache
- [x] **Документация** — `ai_docs/devel/issues/map-perf-rerenders.md`, `map-viewport-pins.md`

## SQL на стенде

Папка: `my-app/`

1. Открыть Supabase SQL Editor
2. Выполнить целиком: `my-app/supabase/sql/2026-09-16-perf-hot-paths.sql`

## Проверка после выката SQL

- [ ] `/map` — кластеры на zoom 9–12, HTML на zoom ≥ 13
- [ ] Список чатов — превью последнего сообщения
- [ ] Unread бейджи после логина (старые непрочитанные не пропали)
- [ ] Новый ЛС — бейдж без перезагрузки
- [ ] Recommended — точное `interested_in`, не пусто при наличии данных

## Не делали (осознанно)

- Снос rAF iOS fix
- Unread окно 90 дней
- `profile_interest_targets` с клиента
- Удаление fallback `resolvePrivateChatBetween`
- Отключение поллинга ленты до realtime
