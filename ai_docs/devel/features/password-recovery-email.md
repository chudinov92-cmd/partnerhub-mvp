# Восстановление пароля по email (Supabase Auth) — OTP-only

## Поведение в приложении (`my-app`)

- На [`auth/page.tsx`](../../../my-app/src/app/auth/page.tsx): режим «Восстановление пароля» и ссылка **Забыли пароль?**.
- Вызов `resetPasswordForEmail(email, { redirectTo: <origin>/auth/reset-password })` через `getEmailAuthResetPasswordUrl()`.
- После успешного запроса UI **редиректит** на `/auth/reset-password?email=...` — основной сценарий **6-значный код**, не ссылка.
- Письма recovery/confirm **без ссылок и кнопок** — только `{{ .Token }}` и plain URL текстом. Шаблоны:
  - [`recovery.html`](../../../my-app/deploy/timeweb/supabase/email-templates/recovery.html)
  - [`confirm.html`](../../../my-app/deploy/timeweb/supabase/email-templates/confirm.html)
- Срок жизни OTP: **10 минут** (`GOTRUE_MAILER_OTP_EXP=600` на VPS).
- Страница [`reset-password/page.tsx`](../../../my-app/src/app/auth/reset-password/page.tsx): по умолчанию форма **Email + код** (`verifyOtp({ email, token, type: "recovery" })`), затем `updateUser({ password })`.
- **Legacy:** если в URL есть `token_hash` / implicit hash — по-прежнему обрабатывается через [`completeAuthEmailCallback`](../../../my-app/src/lib/authEmailCallback.ts); при ошибке показывается OTP-форма.
- Если у пользователя уже есть **recovery-сессия** и он открыл `/auth`, редирект на `/auth/reset-password` ([`authRecovery.ts`](../../../my-app/src/lib/authRecovery.ts)).
- **Регистрация:** после `signUp` сразу показывается блок ввода OTP на `/auth` (`verifyOtp type=signup`); resend — «Письмо с новым кодом отправлено». Повтор и первая отправка ограничены: 60 с, 4 письма на email и 8 на IP за 24 ч (см. [auth-otp-rate-limit.md](auth-otp-rate-limit.md)).
- На `/auth/reset-password` кнопка **«Запросить новый код»** вызывает recovery через `/api/v1/auth/otp-send`, не редирект на `/auth`.
- Hard-delete тестового пользователя оставляет cookie JWT: `getSession()` считает человека залогиненным. `/auth` проверяет `getUser()` на сервере и чистит local session, иначе вечная загрузка онбординга. Повторный `signUp` на занятый email GoTrue отвечает 200 **без письма** — перед тестом чистить `auth.users` по email.
- При ошибке «подтвердите почту» на форме входа — resend + блок OTP.

## Signup vs recovery

| Сценарий | Основной UX | Legacy (если есть старое письмо) |
|----------|-------------|----------------------------------|
| Подтверждение регистрации | Код на `/auth` | `token_hash` / hash → `/auth/callback` |
| Сброс пароля | Код на `/auth/reset-password` | `token_hash` на `/auth/reset-password` |

**PKCE vs implicit:** браузерный клиент (`createBrowserClient`) работает с `flowType: pkce`. Legacy callback обрабатывается вручную на страницах.

Для signup в allow-list добавьте (если ещё нет):

```bash
GOTRUE_URI_ALLOW_LIST=https://zeip.ru/auth/reset-password,https://zeip.ru/auth,https://zeip.ru/auth/callback,http://localhost:3000/auth/reset-password,http://localhost:3000/auth,http://localhost:3000/auth/callback
```

Письма отправляет **GoTrue (Supabase Auth)** через SMTP Timeweb; отправитель: `noreply@zeip.ru` (см. [timeweb-migration-runbook §6](../../../my-app/docs/timeweb-migration-runbook.md)).

> **Локальный dev с телефона по `http://192.168.x.x`:** добавьте origin в `ADDITIONAL_REDIRECT_URLS` на сервере или задайте `NEXT_PUBLIC_EMAIL_AUTH_REDIRECT_ORIGIN=http://localhost:3000`.

---

## VPS: деплой OTP-only

**С Mac (inline, без git pull на VPS):**

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
bash scripts/vps/run-deploy-recovery-template-remote.sh
```

**На VPS (полная починка mailer + OTP_EXP):**

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
git pull --ff-only
bash scripts/vps/fix-auth-email-on-vps.sh
```

Проверка env:

```bash
docker inspect supabase-auth --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -E 'GOTRUE_MAILER_OTP_EXP|GOTRUE_MAILER_SUBJECTS'
```

Ожидается: `GOTRUE_MAILER_OTP_EXP=600`, темы «Код подтверждения — Zeip» / «Код для сброса пароля — Zeip».

---

## Чеклист проверки (prod)

### Подготовка
- [ ] `fix-auth-email-on-vps.sh` + новые шаблоны на VPS
- [ ] `docker exec supabase-auth` — env содержит `GOTRUE_MAILER_OTP_EXP=600`
- [ ] `curl http://templates-server/recovery.html` из auth-сети — plain OTP, без `<a href`

### Recovery (Yandex + Mail.ru)
- [ ] UI: forgot → `v.chudinov.direct@yandex.ru` → редирект на `/auth/reset-password?email=...`
- [ ] Письмо: тема «Код для сброса пароля», **только цифры**, readable (не raw HTML)
- [ ] Ввод кода → форма нового пароля → вход на `/map`
- [ ] Просроченный код (>10 мин) → понятная ошибка
- [ ] Повторный forgot → новый код
- [ ] То же для `vova1992_92@mail.ru`

### Signup
- [ ] Новый email → письмо с кодом → ввод на `/auth` → onboarding
- [ ] Resend → новый код приходит

### Регрессия
- [ ] Legacy `token_hash` в URL (если есть старое письмо) — один тест
- [ ] `bash scripts/vps/check-recovery-users.sh` — `recovery_sent_at` обновляется
- [ ] Транзакционные `/api/email/new-message` — HTTP 200

### Доставляемость
- [ ] Не более **2** тестовых писем на ящик за сессию
- [ ] При попадании в спам — «Не спам» + контакт `noreply@zeip.ru`

### Обход (support)
- [ ] `generate_link` по-прежнему работает для ручного сброса:

```bash
curl -sS -X POST "https://supabase.zeip.ru/auth/v1/admin/generate_link" \
  -H "apikey: $SERVICE_ROLE" -H "Authorization: Bearer $SERVICE_ROLE" \
  -H "Content-Type: application/json" \
  -d '{"type":"recovery","email":"USER@example.com","redirect_to":"https://zeip.ru/auth/reset-password"}'
```

Ответ: `action_link` (legacy) и `email_otp` (6 цифр).

**Диагностика:** `bash scripts/vps/diagnose-auth-email.sh test@gmail.com`

**HELO (Timeweb Spamhaus):** перед тестами recovery — A/PTR `mail.zeip.ru` и `bash scripts/vps/set-mail-helo-hostname.sh` (см. [auth-email-delivery.md](../issues/auth-email-delivery.md#статус-2026-09-10-helo--spamhaus--корневая-причина)).

См. также [auth-email-delivery.md](../issues/auth-email-delivery.md).
