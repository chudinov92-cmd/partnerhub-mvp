# Воронка пейвола — чеклист

## SQL

- [x] Накат [`2026-08-19-paywall-events.sql`](../../my-app/supabase/sql/2026-08-19-paywall-events.sql) на prod
- [x] `deploy-app.sh` включает миграцию `paywall-events`

## Код

- [x] `POST /api/analytics/paywall-event`
- [x] `logPaywallEvent` в `paywallAnalytics.ts` (Метрика сохранена)
- [x] `GET /api/admin/analytics/paywall-funnel`
- [x] Блок на `/admin/analytics`

## Проверка на prod

- [ ] PaywallDrawer → `shown` в `paywall_events`
- [ ] CTA → `cta_buy` + `checkout_started`
- [ ] Trial → `trial_start`
- [ ] `/map?payment=success` → `payment_success`
- [ ] `/admin/analytics` — таблица воронки и конверсии

## Документация

- [x] [`ai_docs/devel/features/paywall-funnel.md`](../devel/features/paywall-funnel.md)
- [x] [`ai_docs/devel/api/paywall-events.md`](../devel/api/paywall-events.md)
