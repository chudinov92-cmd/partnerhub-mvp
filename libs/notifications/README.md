# notifications

Библиотека системы уведомлений и рассылок: Web Push и транзакционные email.

Перенесена из `my-app/src/lib/{push,pushDispatchServer,emailServer,emailContent}` и
`my-app/src/components/Push*` (см. [ai_docs/devel/features/notifications-library.md](../../../ai_docs/devel/features/notifications-library.md)).

## Состав

| Модуль | Назначение | Где доступен |
|---|---|---|
| `push/client.ts` | браузерная подписка / отписка / состояние | корневой `index.ts` |
| `push/dispatchServer.ts` | `dispatchPushForMessage` (web-push) | `@my-startup/notifications/server` |
| `email/content.ts` | ссылки, склонения, HTML-шаблон, превью сообщения | корневой `index.ts` |
| `email/server.ts` | SMTP-отправка (`nodemailer`) | `@my-startup/notifications/server` |
| `components/` | `PushBootstrap`, `PushOptInBanner`, `PushNotificationsSettings` | корневой `index.ts` |

## Правило экспорта (важно)

Клиент-безопасный API (push-client, email-content, UI-компоненты) — из корня
`@my-startup/notifications`.

Серверные модули (`web-push`, `nodemailer` — используют `fs`/`net`) — **только**
через `@my-startup/notifications/server`. Это гарантирует, что клиентский бандл
не тянет серверные пакеты (иначе падает webpack).

## Секреты

Все ключи (`VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `SMTP_*`, `INTERNAL_*_SECRET`,
`SUPABASE_SERVICE_ROLE_KEY`) читаются строго из `process.env` — в коде не зашиты.
Публичный VAPID (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`) попадает в клиент намеренно.

## Building

Run `nx build notifications` to build the library.
