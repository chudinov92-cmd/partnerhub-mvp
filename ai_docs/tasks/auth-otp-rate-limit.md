# Лимит частоты кода подтверждения

- [x] Таблица `auth_otp_sends` + RPC `try_auth_otp_send`
- [x] API `GET/POST /api/v1/auth/otp-send`
- [x] Таймер и disabled на `/auth` и `/auth/reset-password`
- [x] Общий счётчик signup + recovery; 60 с; 4/email/24ч; 8/IP/24ч
- [x] Накатить SQL на VPS (13.09.2026, deploy `7d6e88e`)
- [x] Проверить в браузере на проде: `/auth` «Забыли пароль?» → «Отправить код» сразу enabled; `GET /api/v1/auth/otp-send` → `allowed:true`. Полный цикл 60 с / 4 письма на живой ящик — точечно, без массовой отправки.

## SQL на VPS

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
docker exec -i supabase-db psql -U supabase_admin -d postgres \
  < supabase/sql/2026-09-13-auth-otp-sends.sql
```
