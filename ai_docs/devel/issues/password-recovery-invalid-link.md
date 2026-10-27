# Recovery-ссылка «недействительна или устарела» (2026-08-19)

## Симптом

После «Забыли пароль?» письмо приходит за минуты, клик по кнопке «Сбросить пароль» открывает `/auth/reset-password` с текстом **«Ссылка недействительна или устарела»**.

Письмо содержало GoTrue `ConfirmationURL`:

`https://supabase.zeip.ru/auth/v1/verify?token=…&type=recovery&redirect_to=https://zeip.ru/auth/reset-password`

## Причины (обе воспроизводятся на проде)

1. **PKCE-клиент не поднимает implicit-сессию.**  
   `resetPasswordForEmail` идёт через `supabaseAuthForms` (`flowType: implicit`). После `/verify` GoTrue редиректит на `/auth/reset-password#access_token&refresh_token&type=recovery`. Рабочий клиент — `createBrowserClient` с `flowType: pkce` — отвергает hash (`Not a valid PKCE flow url`). Страница ждала `PASSWORD_RECOVERY` / `amr: recovery` ~2.8 с и показывала ошибку, **не вызывая** `setSession` (в отличие от `/auth/callback` для signup).

2. **Превью почты сжигает одноразовый `/verify`.**  
   Mail.ru / Telegram делают GET на `ConfirmationURL` → токен уже использован, когда пользователь кликает сам. Тот же OTP, что и 6-значный код в письме.

## Исправление

- Шаблон [`recovery.html`](../../../my-app/deploy/timeweb/supabase/email-templates/recovery.html): ссылка на `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery` (страница приложения, не `/auth/v1/verify`). **Нельзя** оставлять `ConfirmationURL` рядом — сканер всё равно сожжёт OTP.
- [`reset-password/page.tsx`](../../../my-app/src/app/auth/reset-password/page.tsx): `completeAuthEmailCallback` (`verifyOtp` / `setSession` / PKCE) + форма 6-значного кода.
- Деплой шаблона: `cd my-app && bash scripts/vps/deploy-email-templates.sh`
- Деплой приложения обязателен, иначе `token_hash` на странице не обработается.

Старое письмо с `/verify` после фикса может сработать, если токен ещё не сожжён (страница сделает `setSession` из hash). Если Mail.ru уже кликнул ссылку — запросить **новое** письмо.

## Связанные документы

- [password-recovery-email.md](../features/password-recovery-email.md)
- [email-confirm-pkce-implicit.md](./email-confirm-pkce-implicit.md)
