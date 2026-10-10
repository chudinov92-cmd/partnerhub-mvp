# Revenue MRR — чеклист

## SQL

- [x] Накат [`2026-08-19-subscription-payments-period.sql`](../../my-app/supabase/sql/2026-08-19-subscription-payments-period.sql) на prod
- [x] Накат [`2026-08-19-mrr-snapshots.sql`](../../my-app/supabase/sql/2026-08-19-mrr-snapshots.sql) на prod
- [x] `deploy-app.sh` включает обе миграции
- [x] Cron `zeip-mrr-snapshot-daily` в `cron.job`

## Код

- [x] Webhook: `period`, `is_renewal`
- [x] `create-payment`: `period` при insert
- [x] `GET /api/admin/analytics/revenue`
- [x] Блок Revenue на `/admin/analytics`

## Проверка на prod

- [x] Бэкфилл `period` на существующих paid (`UPDATE 7` period, `UPDATE 2` is_renewal)
- [ ] Новый платёж → `period` + `is_renewal` в `subscription_payments`
- [x] Строка в `mrr_snapshots` за вчера (`compute_mrr_snapshot` отработал при деплое)
- [ ] `/admin/analytics` — график MRR и карточки

## Документация

- [x] [`ai_docs/devel/features/revenue-metrics.md`](../devel/features/revenue-metrics.md)
