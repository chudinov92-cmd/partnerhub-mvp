# Воронка пейвола (внутренняя аналитика)

## Проблема

Яндекс.Метрика (`reachYandexMetrikaGoal` в `paywallAnalytics.ts`) не привязана к `profile_id`, не даёт cohort-разбивку по тарифу/городу и теряет события при отключённом JS.

## Решение

| Компонент | Назначение |
|---|---|
| `paywall_events` | Таблица событий воронки с `profile_id`, `city`, `subscription_plan` |
| `POST /api/analytics/paywall-event` | Fire-and-forget insert (только авторизованные) |
| `GET /api/admin/analytics/paywall-funnel` | Агрегаты для админки |
| RPC `get_paywall_funnel(p_from, p_to)` | Шаги, конверсии, intent |

Параллельно с Метрикой — клиентские `track*` в [`paywallAnalytics.ts`](../../../my-app/src/lib/paywallAnalytics.ts) вызывают и `logPaywallEvent`.

## Таблица

Миграция: [`my-app/supabase/sql/2026-08-19-paywall-events.sql`](../../../my-app/supabase/sql/2026-08-19-paywall-events.sql)

- `event_type`: `shown | dismissed | cta_buy | trial_start | checkout_started | payment_success`
- `intent`: фактический `PaywallIntent` (`dm`, `chat`, `pin`, `banner`, `view_limit`, `favorites_limit`)
- `plan`, `period` — опционально из body (сейчас track* их не передают)
- RLS: deny-all для `anon`/`authenticated`, запись/чтение через `service_role`

## Клиент

Вызывается из `PaywallDrawer`, CTA «Оформить Pro / Pro+» в `ChatDialog` / `FeedColumn` и `/map` через существующие `trackPaywallShown`, `trackPaywallDismissed`, `trackPaywallCtaBuy`, `trackTrialStart`, `trackCheckoutStarted`, `trackPaymentSuccessAha`.

Гости не пишутся в БД (нет сессии).

Частота показа (`paywallFrequency.ts`): мягкие автопоказы (`dm` с «Написать», `pin`, `banner`) — не чаще 1 раза / 24ч после dismiss. Жёсткие `view_limit` и `favorites_limit` кап не применяют. Явные CTA в композере чата/ЛС идут на `/subscription` и кап не используют.

## SQL накат

**Supabase SQL Editor** — выполнить весь файл миграции.

**VPS:**

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
git pull --ff-only
docker exec -i supabase-db psql -U supabase_admin -d postgres \
  < /root/zeip/my-app/supabase/sql/2026-08-19-paywall-events.sql
bash deploy/timeweb/deploy-app.sh
```

(миграция подключена в `deploy-app.sh`)

## Проверка

```bash
ssh root@186.246.2.104
docker exec -i supabase-db psql -U supabase_admin -d postgres -c \
  "select * from public.paywall_events order by created_at desc limit 20;"
```

1. Авторизованный пользователь открывает PaywallDrawer → строка `shown`
2. CTA / закрытие / trial / `?payment=success` на карте → цепочка событий
3. `/admin/analytics` → блок «Воронка пейвола» с конверсиями

## Ограничения

- `payment_success` пишется только с клиента (`trackPaymentSuccessAha`), не из Robokassa webhook — чтобы не дублировать
- После успешного trial `onClose()` на карте может дополнительно слать `dismissed` (как и в Метрике)

## 152‑ФЗ

В админке только агрегаты, без имён пользователей.
