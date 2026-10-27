# CJM paywall + payment success — чеклист

Статус: код в **main**; prod `zeip.ru` — переключение через `deploy-prod-paid-gate.sh`.

## Деплой prod paid_gate

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
git pull --ff-only
bash scripts/vps/deploy-prod-paid-gate.sh
```

Откат freemium: `bash scripts/vps/rollback-prod-freemium.sh`  
Runbook: [`prod-paid-gate-switch.md`](../devel/reports/prod-paid-gate-switch.md)

## Перед деплоем (автоматически в скрипте)

- [x] Tag `prod-freemium-2026-08-10`
- [ ] VPS backup: `.env.app.freemium.bak` + Docker image `freemium-rollback`
- [x] SQL trial (`2026-08-11-subscription-trial.sql` — в deploy-app.sh)
- [ ] `NEXT_PUBLIC_ACCESS_MODE=paid_gate` в `.env.app`
- [ ] `app-web-test` остановлен

## Paywall (zeip.ru после deploy)

### Login-wall

- [ ] Гость GET `/map` → redirect `/`
- [ ] Share `/map?profile={id}` без сессии → `/auth?redirect=...`

### Unpaid (тариф Free, после входа)

- [ ] PaywallDrawer на DM / чат / пин / избранное
- [ ] 6-й просмотр профиля/сутки → `PinLimitModal`
- [x] Trial 3 дня (1 раз) — скрыт (`TRIAL_ENABLED=false`)

## Return после оплаты

- [ ] `/payment/success?InvId=...`
- [ ] Legacy `/subscription?InvId=...` → redirect
- [ ] «Продолжить» → `/map?payment=success` + resume intent

## Metrika

- [x] `payment_success_*`, `paywall_*`, `trial_start`

## Бэклог

- [ ] Email recover
- [ ] Cancellation survey
