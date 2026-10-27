# Аналитика «кто кого ищет» (профессии)

## Два потока данных

| Поток | Источник | Таблица |
|---|---|---|
| **Спрос в профилях** | `profiles.role_title` + `interested_in` | `profile_interest_targets` |
| **Поиск на карте** | Кнопка «Поиск» при выбранной profession | `map_search_events` |

## Режимы вкладки «Спрос в профилях»

- **A (по умолчанию):** все профили с заполненным `interested_in` — срез «сейчас».
- **B (чекбокс):** только пользователи с `last_seen_at` в выбранном периоде.

## Поиск на карте

- Логируется только если выбрана **профессия** в фильтре.
- Гости и авторизованные — фильтр в админке: все / authed / guest.

## SQL

Миграция: [`my-app/supabase/sql/2026-05-25-profession-demand-analytics.sql`](../../../my-app/supabase/sql/2026-05-25-profession-demand-analytics.sql)

**Supabase SQL Editor** — вставить и выполнить весь файл.

**VPS:**

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
bash deploy/timeweb/deploy-app.sh
```

(миграция подключена в `deploy-app.sh`)

## Админка

`/admin/analytics` → блок «Кто кого ищет (профессии)».

API:
- `GET /api/admin/analytics/profile-demand`
- `GET /api/admin/analytics/map-search`
- `POST /api/analytics/map-search` (клиент, best-effort)

## 152‑ФЗ

IP не используется. В отчётах — агрегаты без имён. Гости логируются без `profile_id`.
