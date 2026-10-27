# DAU / WAU / Retention

## Проблема

`profiles.last_seen_at` — одна перезаписываемая метка. Нет истории посещений по дням, нельзя считать DAU вчера, retention D7/D30 и когорты.

## Решение

| Компонент | Назначение |
|---|---|
| `user_daily_activity` | Одна строка на `(profile_id, day)` в UTC |
| `POST /api/analytics/daily-ping` | Upsert активности за сегодня (service_role) |
| `GET /api/admin/analytics/activity-kpis` | DAU вчера, WAU 7д, MAU 30д для админки |

## Таблица

Миграция: [`my-app/supabase/sql/2026-08-19-user-daily-activity.sql`](../../../my-app/supabase/sql/2026-08-19-user-daily-activity.sql)

- PK `(profile_id, day)`
- RLS включён, deny-all для `anon`/`authenticated` — только `service_role`
- RPC `get_activity_kpis()` — три числа для карточек

## Клиентский ping

- [`analyticsService.logDailyActivity()`](../../../my-app/src/services/analyticsService.ts) — best-effort `POST`, `keepalive: true`
- Вызывается один раз при монтировании [`/map`](../../../my-app/src/app/map/page.tsx) после появления `currentUser.profileId`
- **Ограничение:** в DAU попадают только пользователи, зашедшие на `/map`. `last_seen_at` из TopBar в таблицу не пишется.

## KPI (UTC)

- **DAU вчера** — строки за `today_utc - 1`
- **WAU 7д** — distinct `profile_id` за `[today_utc-6, today_utc]`
- **MAU 30д** — distinct за `[today_utc-29, today_utc]`

## SQL накат

**Supabase SQL Editor** — выполнить весь файл миграции.

**VPS:**

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
git pull
docker exec -i supabase-db psql -U supabase_admin -d postgres \
  < /root/zeip/my-app/supabase/sql/2026-08-19-user-daily-activity.sql
```

Или через деплой (миграция в `deploy/timeweb/deploy-app.sh`):

```bash
ssh root@186.246.2.104
bash /root/zeip/my-app/deploy/timeweb/deploy-app.sh
```

## Проверка

```bash
ssh root@186.246.2.104
docker exec -i supabase-db psql -U supabase_admin -d postgres -c \
  "select * from public.user_daily_activity where day = (timezone('utc', now()))::date order by profile_id limit 20;"
```

После визита на `/map` — строка за сегодня. В `/admin/analytics` — карточки DAU/WAU/MAU.

## Retention (ручной SQL)

Запросы D7 и DAU-ряд — в комментариях миграции. UI для retention-графиков пока не реализован.

## 152‑ФЗ

Только агрегаты в админке, без имён пользователей в KPI.
