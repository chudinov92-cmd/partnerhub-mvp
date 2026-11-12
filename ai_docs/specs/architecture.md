# Архитектура Zeip

## Стек

| Компонент | Технология |
|-----------|------------|
| Фронтенд | Next.js 16 (App Router, `app/`), React 19, TypeScript |
| Стилизация | Tailwind CSS |
| База данных | PostgreSQL (self-hosted Supabase) |
| Auth | Supabase Auth (GoTrue, self-hosted) |
| Realtime | Supabase Realtime |
| Хостинг | Timeweb VPS (один сервер, Docker) |
| Веб-сервер | Caddy (TLS-терминатор, reverse-proxy) |

## Nx монорепозиторий

Проект организован как Nx-монорепозиторий:

- **`my-app/`** — основное приложение Next.js («тонкий слой»).
- **`libs/`** — изолированные библиотеки, вся предметная логика.

### Библиотеки (`libs/`)

| Пакет | Назначение | Публичное API |
|-------|------------|---------------|
| `@my-startup/auth` | Авторизация: клиенты Supabase, сессии, токены, OTP, BFF-логин | `supabase`, `createSupabaseAdmin`, `authGetUser`, `authSignOut`, `authForms*` |
| `@my-startup/chat` | Чаты: сервисы чатов/ЛС, realtime, линковка сообщений, поддержка | `*Service`, `useChatMessagesRealtime`, `SUPPORT_AUTH_USER_ID` |
| `@my-startup/subscription` | Подписки: планы, лимиты, Robokassa-платежи | (сервисы подписок) |
| `@my-startup/analytics` | Аналитика: Яндекс.Метрика, VK Pixel, paywall-события | `initYandexMetrika`, `initVkPixel`, трекеры |
| `@my-startup/notifications` | Уведомления: web-push (VAPID), email (Nodemailer), компоненты | клиентский API + `server.ts` по subpath `./server` |
| `@my-startup/profile` | Профили и карта: сервисы/хуки/каталоги/компоненты | `profileService`, `contactService`, `useProfiles`, `ProfilePreviewCard` |
| `@my-startup/map-ui` | Карта Leaflet: `PartnerMap`, `ProfileLocationPicker`, гео-приватность | компоненты карты, обфускация координат |
| `@my-startup/admin` | Админ-панель: контракты, админ-сервисы, модерация | `adminFetch*`, `adminInsert*`, `ModerationPurgeDialog` |
| `@my-startup/ui` | UI-компоненты (вспомогательные) | |
| `@my-startup/hooks` | React-хуки общего назначения | `useIsLgUp`, `useMobileKeyboardInset`, `useOverlayBodyLock` |

### Сервисный слой (`src/services/`)

Страницы и компоненты не вызывают `.from()` / `.rpc()` напрямую — только функции из сервисов. В `src/services/` находятся тонкие barrel-реэкспорты из библиотек:

| Barrel | Источник |
|--------|----------|
| `profileService.ts` | `@my-startup/profile` |
| `contactService.ts` | `@my-startup/profile` |
| `chatService.ts` | `@my-startup/chat` |
| `adminService.ts` | приложение (не вынесено) |

Подробнее: [`ai_docs/devel/components/services-layer.md`](../devel/components/services-layer.md).

### Правило «my-app — тонкий, логика в библиотеках»

- `my-app` содержит только страницы (`app/`), middleware, layout, тонкие API-роуты, глобальные компоненты и конфигурацию.
- Вся предметная логика — в `libs/`.
- **Циклические зависимости запрещены**: `libs/` никогда не импортируют что-либо из `my-app`.

### Правило subpath `./server`

Клиентский бандл не должен тянуть серверные модули (`web-push`, `nodemailer` — используют `fs`/`net`). Поэтому у `@my-startup/notifications` серверная часть экспортируется только через `@my-startup/notifications/server`.

## Типы модулей в `my-app`

```
my-app/src/
  app/            — страницы (App Router) + API route handlers
  components/     — общие React-компоненты
  contexts/       — React-контексты (SelectedCityContext)
  data/           — статические данные (города, timezone, legal)
  hooks/          — React-хуки (useAuth, useContacts, useChat и др.)
  lib/            — утилиты, серверные клиенты, CSP, справочники
  middleware.ts   — CSP nonce + auth guard + security headers
  services/       — barrel-реэкспорты библиотечных сервисов
  types/          — общие типы
```

## Файловая система документации

```
ai_docs/
  specs/           ← OpenSpec (эта папка)
  devel/           ← техническая документация фич/экранов/компонентов/API
    features/      — описания фич (28 файлов)
    screens/       — описания экранов (6 файлов: auth, landing, private-chat, subscription, contacts, onboarding-quiz)
    api/           — API (robokassa, paywall-events)
    components/    — сервисный слой, mobile-select-sheet
    issues/        — описания проблем (10 файлов)
    reports/       — отчёты и расследования (9 файлов)
  tasks/           — описания задач (19 файлов)
  marketing/       — маркетинговые документы
  design/          — дизайн (пока пусто)

my-app/docs/
  ai_context.md           — основной технический документ (предшественник specs)
  timeweb-migration-runbook.md  — ранбук миграции на Timeweb
  performance-rollout.md       — заметки по производительности
  archive/                    — архивные SQL-файлы
```

## Связанные документы

- [data-model.md](data-model.md) — модель данных Supabase
- [frontend.md](frontend.md) — структура страниц и компонентов
- [deployment.md](deployment.md) — инфраструктура и деплой