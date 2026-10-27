# Библиотека уведомлений: @my-startup/notifications

## Статус

Вынесена из `my-app` в Nx-библиотеку `libs/notifications` (Кандидат №4).
API-роуты остались тонкими обёртками в `my-app`, как и для `@my-startup/chat`.

## Карта модулей

```
libs/notifications/src/
  index.ts               ← клиентский API (push-client, email-content, компоненты)
  server.ts              ← серверный API (web-push, nodemailer) по subpath "./server"
  lib/
    push/client.ts        ← enable/disable/getState, localStorage-dismiss
    push/dispatchServer.ts← dispatchPushForMessage (web-push, RLS-логика блоков)
    email/server.ts       ← SMTP send/isConfigured/verifyInternalEmailSecret
    email/content.ts      ← getSiteUrl, emailMapLink/ChatLink, pluralContacts, wrapper
    components/           ← PushBootstrap, PushOptInBanner, PushNotificationsSettings
```

## Граф зависимостей

```
@my-startup/notifications ──> @my-startup/auth        (supabase, createSupabaseAdmin)
                          ──> npm: web-push          (server.ts)
                          ──> npm: nodemailer        (server.ts)
                          ──> react, next            (peer)
```

Циклических зависимостей нет: библиотека не импортирует `my-app`.
Импорт `SUPPORT_AUTH_USER_ID` из `@my-startup/chat` остался в app-маршруте
`api/email/city-growth`, поэтому notifications не тянет chat.

## Правило subpath "./server"

Клиентский бандл НЕ должен тянуть `web-push`/`nodemailer` (они используют
`fs`/`net` — только Node). Поэтому серверные модули экспортируются исключительно
через `@my-startup/notifications/server`, а не через корень. Иначе webpack падает
на `map/page.tsx` («Module not found: Can't resolve 'fs'»).

## Потребители в my-app

- Route-хендлеры push/email — импортируют `@my-startup/notifications/server`
- `layout.tsx`, `settings/page.tsx`, `map/page.tsx` — импортируют клиентский API
- `app/api/chat/send-message` — dispatch после INSERT в messages
- `app/api/admin/users/*/{moderationPurgeEmail,purge}` — email о модерации

## Env-переменные

Секреты строго через `process.env` (в коде не зашиты):

| Переменная | Где | Назначение |
|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | push/client, dispatch | публичный VAPID |
| `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | dispatch | подпись push |
| `SMTP_HOST/PORT/USER/PASS/ADMIN_EMAIL/FROM/SENDER_NAME/HELO_NAME` | email/server | транзакционные письма |
| `INTERNAL_PUSH_SECRET` / `INTERNAL_EMAIL_SECRET` | dispatch/email routes | x-internal-secret |
| `NEXT_PUBLIC_SITE_URL` | email/content | дефолт zeip.ru |

## Критерии готовности

- [x] `npx nx build notifications` — проходит
- [x] `npx nx build my-app` — проходит (свежая сборка, webpack)
- [x] Lint библиотеки — чисто
- [ ] Lint my-app — замечания только по предсуществующим react-hooks<h5>, не связаны с этим переносом