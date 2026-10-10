# Лимит входа по паролю + security headers

- [x] SQL `auth_login_attempts` + RPC `try_auth_login`
- [x] API `POST /api/v1/auth/login` (fail-closed)
- [x] `/auth`, `/settings`, `/auth/reset-password` — BFF login; клиентский `signInWithPassword` убран
- [x] Caddy: HSTS + X-Frame-Options
- [x] GoTrue + Kong rate limit (`kong.yml`)
- [x] Деплой app `cacba5f` на VPS (16.09.2026)
- [x] `curl -sI https://zeip.ru` → `strict-transport-security`, `x-frame-options: DENY`
- [x] Проверка после деплоя: Kong 11-й `/auth/v1/token` → 429; BFF 6-я неудача → `email_lockout` 15:00

## SQL на VPS

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
docker exec -i supabase-db psql -U supabase_admin -d postgres \
  < supabase/sql/2026-09-16-auth-login-attempts.sql
```
