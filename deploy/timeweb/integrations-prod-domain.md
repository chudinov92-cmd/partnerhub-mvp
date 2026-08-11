# Внешние интеграции: zeip.ru

Публичный URL приложения: **https://zeip.ru**  
Backend Supabase без изменений: **https://supabase.zeip.ru**

## Robokassa

В личном кабинете Robokassa указать URL (тестовый режим: `ROBOKASSA_TEST_MODE=1` в `.env.app` на VPS):

| Параметр | URL |
|----------|-----|
| Result URL | `https://zeip.ru/api/subscription/webhook` |
| Success URL | `https://zeip.ru/payment/success` |
| Fail URL | `https://zeip.ru/payment/fail` |

## VK Maps

В кабинете VK Maps → ключ API → разрешённые домены:

- `zeip.ru`
- (опционально) `localhost` для локальной разработки

Удалить `test.zeip.ru`, если больше не используется.

## Яндекс.Метрика / VK Pixel

Счётчик `110816502` и пиксель `3780633` работают на основном домене без смены ID.

## Яндекс.Метрика

Цели return-flow (добавить в интерфейсе Метрики):

- `payment_success_open`
- `payment_success_activated`
- `payment_success_need_login`
- `payment_success_timeout`

## Smoke после настройки

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
bash scripts/migration/healthcheck_timeweb.sh "https://zeip.ru" "https://supabase.zeip.ru"
```
