# Внешние интеграции: test.zeip.ru

Публичный URL приложения: **https://test.zeip.ru**  
Backend Supabase без изменений: **https://supabase.zeip.ru**

## Robokassa

В личном кабинете Robokassa добавить URL (или временно отключить оплату на стенде):

| Параметр | URL |
|----------|-----|
| Result URL | `https://test.zeip.ru/api/subscription/webhook` |
| Success URL | `https://test.zeip.ru/settings?payment=success` |
| Fail URL | `https://test.zeip.ru/settings?payment=fail` |

Проверить, что `ROBOKASSA_TEST_MODE=1` в `.env.app` на VPS для test-стенда.

## VK Maps

В кабинете VK Maps → ключ API → разрешённые домены:

- `test.zeip.ru`
- (опционально) `localhost` для локальной разработки

## Яндекс.Метрика / VK Pixel

Счётчик `110816502` и пиксель `3780633` работают на поддомене без смены ID.

## Smoke после настройки

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
bash scripts/migration/healthcheck_timeweb.sh "https://test.zeip.ru" "https://supabase.zeip.ru"
```
