# Email confirm: PKCE-клиент vs implicit hash (2026-08-13)

## Симптом

После клика по ссылке подтверждения регистрации пользователь попадает на `/auth`, сессия не создаётся. При ручном входе — «Проверьте почту и перейдите по ссылке подтверждения».

## Причина

1. GoTrue после `/auth/v1/verify?type=signup` редиректит на `redirect_to` с **implicit hash** (`#access_token&refresh_token&type=signup`).
2. Рабочий браузерный клиент — `createBrowserClient` с `flowType: pkce` — отвергает implicit callback (`Not a valid PKCE flow url`).
3. Регистрация шла через `supabaseAuthForms` (отдельный клиент, `persistSession: false`), PKCE verifier не сохранялся для обмена `?code=`.
4. Дефолтный post-login redirect был `/map`, а не `/onboarding`.

## Исправление

- [`my-app/src/lib/authEmailCallback.ts`](../../../my-app/src/lib/authEmailCallback.ts) — явный `setSession` / `exchangeCodeForSession` / `verifyOtp`.
- [`my-app/src/app/auth/callback/page.tsx`](../../../my-app/src/app/auth/callback/page.tsx) — целевой `emailRedirectTo`.
- [`my-app/src/app/auth/page.tsx`](../../../my-app/src/app/auth/page.tsx) — legacy `/auth` hash, resend confirmation, дефолт `/onboarding`.
- VPS: добавить `https://zeip.ru/auth/callback` в `GOTRUE_URI_ALLOW_LIST`.

## Связанные документы

- [password-recovery-email.md](../features/password-recovery-email.md)
- [onboarding-funnel.md](../features/onboarding-funnel.md)
