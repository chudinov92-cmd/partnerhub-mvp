# Лимит отправки OTP (email bombing)

Защита от массовой рассылки кодов подтверждения и сброса пароля. Код: API [`my-app/src/app/api/v1/auth/otp-send/route.ts`](../../../my-app/src/app/api/v1/auth/otp-send/route.ts), журнал [`auth_otp_sends`](../../../my-app/supabase/sql/2026-09-13-auth-otp-sends.sql).

## Правила

Скользящие **24 часа**. Регистрация и сброс пароля — **общий** счётчик.

| Ключ | Лимит |
|---|---|
| Email | не чаще чем раз в **60 с**; не более **4** писем за 24 ч |
| IP | не более **8** писем за 24 ч |

IP неизвестен (`x-forwarded-for` / `x-real-ip` пустые) — лимит по IP не применяется, по email применяется.

В журнал попадают только **состоявшиеся** отправки: после успешного `signUp` с письмом, `resend` и `resetPasswordForEmail`. Тихий дубль регистрации без письма **не** пишется.

## API

- `GET /api/v1/auth/otp-send?email=` — статус для таймера (`allowed`, `retry_after_seconds`, `reason`, `message`). Всегда HTTP 200 при валидном email.
- `POST /api/v1/auth/otp-send` `{ email, kind }`:
  - `signup` — только проверка (без insert);
  - `record` — insert после реальной отправки при регистрации;
  - `signup_resend` / `recovery` — insert, затем GoTrue; при ошибке GoTrue строка удаляется.
- POST при лимите: **429** `{ reason, retry_after_seconds, message }`.

`reason`: `email_cooldown` | `email_daily` | `ip_daily`.

## UI

На `/auth` и `/auth/reset-password` кнопка повторной отправки **disabled**, пока `retry_after > 0`. Подпись с обратным отсчётом: «Повторно запросить код можно через 0:59» / «через 12 ч 05 мин».

## Применение SQL (VPS)

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
docker exec -i supabase-db psql -U supabase_admin -d postgres \
  < supabase/sql/2026-09-13-auth-otp-sends.sql
```

Локально:

```bash
# папка: /Users/vladimirchudinov/Desktop/my-startup/my-app
docker exec -i supabase-db psql -U supabase_admin -d postgres \
  < supabase/sql/2026-09-13-auth-otp-sends.sql
```

## Вне скоупа

- CAPTCHA (Turnstile) против распределённого ботнета.
- Лимит неверных вводов `verifyOtp`.
- Глобальная квота GoTrue `GOTRUE_RATE_LIMIT_EMAIL_SENT` (это SMTP на весь проект, не ящик жертвы).
