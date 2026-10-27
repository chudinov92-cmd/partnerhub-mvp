# Лимит входа по паролю (brute force)

Защита от перебора паролей и credential stuffing. Код: API [`my-app/src/app/api/v1/auth/login/route.ts`](../../../my-app/src/app/api/v1/auth/login/route.ts), журнал [`auth_login_attempts`](../../../my-app/supabase/sql/2026-09-16-auth-login-attempts.sql).

Дополнительно на краю: GoTrue `GOTRUE_RATE_LIMIT_*` и Kong `rate-limiting` 10 req/min/IP на `supabase.zeip.ru` (DB-less `kong.yml`, не Admin API) — см. [`apply-gotrue-rate-limit.sh`](../../../my-app/scripts/vps/apply-gotrue-rate-limit.sh).

## Правила

Скользящие **15 минут**.

| Ключ | Лимит |
|---|---|
| Email | **5** неудачных попыток → пауза **15 мин** |
| IP | **20** неудачных попыток за 15 мин → 429 |

Успешный вход **сбрасывает** счётчик неудач по email.

IP неизвестен (`x-forwarded-for` / `x-real-ip` пустые) — лимит по IP не применяется, по email применяется.

При lockout и неверном пароле клиенту — разные HTTP-коды (429 vs 401), но без раскрытия существования аккаунта в тексте lockout.

## API

- `POST /api/v1/auth/login` `{ email, password }`:
  1. RPC `try_auth_login` dry-run;
  2. server-side `signInWithPassword` + `Set-Cookie` сессии;
  3. запись успеха/неудачи в журнал;
  4. ответ `{ ok, user_id }` — клиент редиректит без прямого GoTrue.
- При lockout: **429** `{ reason, retry_after_seconds, message }`.
- При неверных данных: **401** `{ error: "Неверный логин или пароль" }` (или текст про неподтверждённый email).
- Если RPC нет (SQL не накатили): **503**, вход закрыт (не fail-open).

`reason`: `email_lockout` | `ip_lockout`.

## UI

- `/auth` — вход через BFF, не прямой вызов GoTrue из браузера. Обёртки `authSignInWithPassword` / `authFormsSignInWithPassword` удалены.
- `/settings` — проверка текущего пароля через тот же BFF.
- `/auth/reset-password` — повторный вход после recovery через BFF.

## Применение SQL (VPS)

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
docker exec -i supabase-db psql -U supabase_admin -d postgres \
  < supabase/sql/2026-09-16-auth-login-attempts.sql
```

Локально:

```bash
# папка: /Users/vladimirchudinov/Desktop/my-startup/my-app
docker exec -i supabase-db psql -U supabase_admin -d postgres \
  < supabase/sql/2026-09-16-auth-login-attempts.sql
```

## Caddy + GoTrue (VPS)

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
bash scripts/vps/apply-caddy-security-headers.sh
bash scripts/vps/apply-gotrue-rate-limit.sh
bash deploy/timeweb/deploy-app.sh
```

## Вне скоупа

- CAPTCHA (Turnstile).
- BFF для `verifyOtp`, PKCE callback, refresh (остаются client → GoTrue; режутся Kong/GoTrue по IP).
- Изменение минимальной длины пароля (остаётся 6 в UI).
