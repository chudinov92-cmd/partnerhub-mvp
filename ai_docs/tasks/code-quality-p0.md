# P0: надёжность оплаты, DRY подписки, ошибки API

> План: `.cursor/plans/p0_code_quality_d174ccec.plan.md`

## Фаза 1 — webhook

- [x] SQL [`2026-09-16-apply-robokassa-payment.sql`](../../my-app/supabase/sql/2026-09-16-apply-robokassa-payment.sql) на prod (миграция в `deploy-app.sh`; накат + инцидент [`2026-09-17-activate-payment-965579733.sql`](../../my-app/supabase/sql/2026-09-17-activate-payment-965579733.sql))
- [x] Webhook вызывает RPC `apply_robokassa_payment`
- [x] Повтор webhook при `paid` + сломанном профиле → `repaired` + `OK{InvId}`

## Фаза 2 — DRY подписки

- [x] `isActiveProProfile` / `getEffectiveSubscriptionPlan` в `subscriptionPlans.ts`
- [x] Убраны локальные копии в payment routes
- [x] `buildRobokassaPaymentUrl` + `allocRobokassaInvId` в `robokassa.ts`
- [x] Убран мёртвый двойной switch в `getDmPartnersDailyLimit`

## Фаза 3 — admin + 500

- [x] `requireMinRole` в `requireAdmin.ts`
- [x] `jsonRouteError` во всех admin/analytics catch
- [x] Payment/chat/email-cron: внешний try/catch + лог
- [x] Admin pages: `getErrorMessage` вместо `e: any`

## Фаза 4 — контракт ошибок

- [x] `lib/errors.ts`, реэкспорт из `support.ts`
- [x] `useMapPageController`: `getErrorMessage` в hot paths
- [x] Правило в `services-layer.md`

## Фаза 5 — хуки карты

- [x] `useFeedHandlers` подключён в контроллере
- [x] Реальный `useChatHandlers`
- [x] Реальный `useMapEffects`

## Фаза 6 — справочники

- [x] `catalogCache.ts`
- [x] `onboarding` / `profile` через `useProfiles`

## Накат SQL (prod)

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
ssh root@186.246.2.104
cd /root/zeip/my-app
git pull
docker exec -i supabase-db psql -U supabase_admin -d postgres \
  < /root/zeip/my-app/supabase/sql/2026-09-16-apply-robokassa-payment.sql
docker exec -i supabase-db psql -U supabase_admin -d postgres \
  < /root/zeip/my-app/supabase/sql/2026-09-17-activate-payment-965579733.sql
```

Или через `bash /root/zeip/my-app/deploy/timeweb/deploy-app.sh` — миграция `apply-robokassa-payment` в списке.
