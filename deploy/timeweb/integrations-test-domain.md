# Внешние интеграции: test.zeip.ru (параллельно prod)

> Prod: [`integrations-prod-domain.md`](integrations-prod-domain.md) — `https://zeip.ru`  
> Test: **`https://test.zeip.ru`** — режим `paid_gate`, Robokassa test mode.

Backend Supabase общий: **https://supabase.zeip.ru**

## Robokassa

В личном кабинете Robokassa **добавить** URL test (не удаляя prod):

| Параметр | URL |
|----------|-----|
| Result URL | `https://test.zeip.ru/api/subscription/webhook` |
| Success URL | `https://test.zeip.ru/payment/success` |
| Fail URL | `https://test.zeip.ru/payment/fail` |

На VPS в `.env.app.test`: `ROBOKASSA_TEST_MODE=1`

## VK Maps

В кабинете VK Maps → ключ API → разрешённые домены:

- `zeip.ru`
- `test.zeip.ru`
- `localhost` (локальная разработка)

## Яндекс.Метрика / VK Pixel

Счётчик `110816502` и пиксель `3780633` работают на поддомене без смены ID.

## Яндекс.Метрика

Цели return-flow + paywall (см. [`ai_docs/tasks/cjm-paywall-implementation.md`](../../../Desktop/my-startup/ai_docs/tasks/cjm-paywall-implementation.md)):

- `payment_success_open`, `payment_success_activated`, `payment_success_need_login`, `payment_success_timeout`
- paywall: `auth_gate_shown_*`, `paywall_shown_*`, `checkout_started`, `trial_start`, `payment_success_aha`

## Smoke

```bash
curl -sI https://zeip.ru/ | head -3
curl -sI https://test.zeip.ru/ | head -3
cd "/Users/vladimirchudinov/Downloads/Zeip Paid"
bash scripts/migration/healthcheck_timeweb.sh "https://test.zeip.ru" "https://supabase.zeip.ru"
```

## Деплой test-контейнера

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app && git checkout paid-access && git pull --ff-only
bash deploy/timeweb/deploy-app-test.sh
```
