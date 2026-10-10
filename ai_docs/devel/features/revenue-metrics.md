# Revenue-метрики (MRR / Churn / LTV)

## Проблема

`subscription_payments` хранит каждый платёж Robokassa, но без явного `period` и флага продления нельзя считать MRR, новых клиентов и отток во времени. Recurring у Robokassa нет — каждая оплата отдельный `InvId`.

## Решение

| Компонент | Назначение |
|---|---|
| `subscription_payments.period` | `monthly` \| `yearly` из `plan` |
| `subscription_payments.is_renewal` | `true`, если у `profile_id` уже был paid до этого |
| Webhook | Запись `period` + `is_renewal` при `status=paid` |
| `mrr_snapshots` | Ежедневный снапшот KPI (UTC) |
| `compute_mrr_snapshot()` | Расчёт и upsert за дату |
| `get_revenue_metrics()` | RPC для админки |
| `GET /api/admin/analytics/revenue` | MRR-серия, вчера, LTV |
| `/admin/analytics` → Revenue | График + карточки |

## Миграции

1. [`my-app/supabase/sql/2026-08-19-subscription-payments-period.sql`](../../../my-app/supabase/sql/2026-08-19-subscription-payments-period.sql)
2. [`my-app/supabase/sql/2026-08-19-mrr-snapshots.sql`](../../../my-app/supabase/sql/2026-08-19-mrr-snapshots.sql) — **после** period (зависит от колонок)

## Формулы (UTC)

- **MRR:** `active_pro × 249 + active_pro_plus × 449` (годовые по месячной цене тарифа)
- **Активные:** `subscription_plan in (pro, pro_plus)`, `pro_expires_at > конец дня`, **и** был хотя бы один `paid` (trial без платежа не в MRR)
- **Новые / продления:** paid за день по `is_renewal`
- **Отток:** `pro_expires_at::date = день`, срок в прошлом, был paid (не истёкший trial)
- **LTV (грубо):** средний `sum(out_sum)` на клиента с paid-платежами

## Webhook

[`my-app/src/app/api/subscription/webhook/route.ts`](../../../my-app/src/app/api/subscription/webhook/route.ts) — до апгрейда/активации профиля:

- `priorPaidCount` по `profile_id`
- `update`: `period`, `is_renewal`, `paid_at`

## SQL накат

**Supabase SQL Editor** — оба файла по порядку.

**VPS:**

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
git pull
docker exec -i supabase-db psql -U supabase_admin -d postgres \
  < /root/zeip/my-app/supabase/sql/2026-08-19-subscription-payments-period.sql
docker exec -i supabase-db psql -U supabase_admin -d postgres \
  < /root/zeip/my-app/supabase/sql/2026-08-19-mrr-snapshots.sql
```

Или через деплой (миграции в `deploy/timeweb/deploy-app.sh`):

```bash
ssh root@186.246.2.104
bash /root/zeip/my-app/deploy/timeweb/deploy-app.sh
```

## Проверка

```bash
ssh root@186.246.2.104
docker exec -i supabase-db psql -U supabase_admin -d postgres -c \
  "select * from public.mrr_snapshots order by snapshot_date desc limit 5;"
docker exec -i supabase-db psql -U supabase_admin -d postgres -c \
  "select jobid, jobname, schedule from cron.job where jobname = 'zeip-mrr-snapshot-daily';"
```

После webhook нового платежа:

```bash
docker exec -i supabase-db psql -U supabase_admin -d postgres -c \
  "select id, profile_id, plan, period, is_renewal, paid_at from subscription_payments where status='paid' order by paid_at desc limit 10;"
```

В `/admin/analytics` — секция **Revenue**: график MRR, карточки Pro / Pro+ / новые / отток / LTV.

## pg_cron

- Job: `zeip-mrr-snapshot-daily`
- Расписание: `0 3 * * *` (03:00 UTC)
- При накате миграции сразу вызывается `compute_mrr_snapshot(вчера)`.

## 152‑ФЗ

Только агрегаты в админке, без персональных данных в KPI.
