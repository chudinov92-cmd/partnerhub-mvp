# Функциональное E2E-тестирование Zeip

## Инфраструктура

- **Playwright**: `my-app/playwright.config.ts`, тесты в `my-app/e2e/*.spec.ts`
- **MCP Playwright**: `~/.cursor/mcp.json` — пакет `@playwright/mcp@latest` (перезапустите MCP в Cursor после обновления)
- **Переменные**: скопируйте `my-app/e2e.env.example` → `my-app/.env.e2e`

## Сколько тестов в наборе

**Полный прогон — 52 теста** в 12 файлах (`playwright test --list`):

| Файл | Тестов | Проект |
|------|--------|--------|
| `e2e/auth.spec.ts` | 8 | desktop |
| `e2e/map.spec.ts` | 7 | desktop |
| `e2e/profile.spec.ts` | 6 | desktop |
| `e2e/admin.spec.ts` | 6 | desktop |
| `e2e/edge-cases.spec.ts` | 5 | desktop |
| `e2e/general-chat.spec.ts` | 4 | desktop |
| `e2e/mobile.spec.ts` | 3 | **mobile** (Pixel 5) |
| `e2e/dm.spec.ts` | 3 | desktop |
| `e2e/push.spec.ts` | 3 | desktop |
| `e2e/subscription.spec.ts` | 3 | desktop |
| `e2e/contacts.spec.ts` | 2 | desktop |
| `e2e/marketing.spec.ts` | 2 | desktop |

- **desktop-chromium**: 49 тестов (все `*.spec.ts`, кроме `mobile.spec.ts`)
- **mobile-chromium**: 3 теста (только `mobile.spec.ts`)

Если запускать только два файла, например `subscription` + `admin`, Playwright выполнит **9 тестов** — это не полный набор, а точечная проверка фаз 7 и 9.

## Запуск

**Полный прогон (52 теста):**

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
npm install
npm run test:e2e:install
cp e2e.env.example .env.e2e
# заполните E2E_USER_EMAIL, E2E_USER_PASSWORD, E2E_PRO_USER_*, E2E_ADMIN_*
npm run test:e2e
```

**Точечный прогон (пример — 9 тестов):**

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
npx playwright test e2e/subscription.spec.ts e2e/admin.spec.ts
```

**Только desktop (49 тестов, без mobile):**

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
npx playwright test --project=desktop-chromium
```

Отчёт HTML: `npm run test:e2e:report`

Против локального dev-сервера:

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
E2E_BASE_URL=http://localhost:3000 npm run dev
# в другом терминале:
E2E_BASE_URL=http://localhost:3000 npm run test:e2e
```

## Покрытие по фазам плана

| Фаза | Файл | Сценарии |
|------|------|----------|
| 1 Auth | `e2e/auth.spec.ts` | TC-1.1–1.7 |
| 2 Profile | `e2e/profile.spec.ts` | TC-2.1–2.5 |
| 3 Map | `e2e/map.spec.ts` | TC-3.1–3.6, 3.9 |
| 4 Chat | `e2e/general-chat.spec.ts` | TC-4.1–4.5 |
| 5 DM | `e2e/dm.spec.ts` | TC-5.1, 5.6–5.7 |
| 6 Contacts | `e2e/contacts.spec.ts` | TC-6.1, 6.3 |
| 7 Subscription | `e2e/subscription.spec.ts` | TC-7.1–7.3 |
| 8 Push | `e2e/push.spec.ts` | TC-8.1, 8.2, 8.4 |
| 9 Admin | `e2e/admin.spec.ts` | TC-9.1–9.8, 12.3 |
| 10 Mobile | `e2e/mobile.spec.ts` | TC-10.1–10.3 |
| 11 Marketing | `e2e/marketing.spec.ts` | TC-11.1–11.2 |
| 12 Edge | `e2e/edge-cases.spec.ts` | TC-12.2–12.5 |

Сценарии, требующие второго пользователя, Pro-оплаты, recovery-ссылки из почты или реального Web Push, помечены как частично автоматизированные; полный прогон — с заполненным `.env.e2e`.

## Пропуски без `.env.e2e`

Тесты с `describeWithUser` / `describeWithAdmin` пропускаются, если не заданы `E2E_USER_*` / `E2E_ADMIN_*`. Smoke-тесты (гость, маркетинг, API 401/403) выполняются всегда. При пустом `.env.e2e` из 52 выполнятся не все — фактическое число будет меньше.

## Типичные падения (prod `https://zeip.ru`)

| Симптом | Причина | Что делать |
|---------|---------|------------|
| Редирект на `/auth/reset-password` («Новый пароль») в profile/subscription/push | У `test_user@zeip.ru` в Auth есть `recovery_sent_at` (старый TC-1.4 или «Забыли пароль?») | На VPS: `supabase/sql/2026-05-29-clear-test-user-recovery.sql`. В e2e TC-1.4 больше не трогает `E2E_USER`. Деплой фикса `authRecovery.ts` (не считать `recovery_sent_at` активной recovery-сессией) |
| TC-1.6b `still waiting for sign-in` | После входа Free-пользователь попадает на `/admin` → 403 текстом, без TopBar | Исправлено в `e2e/helpers/auth.ts` (403 = сессия есть) |
| TC-3.3 / TC-3.5 timeout «Настройки поиска» | Часто следствие recovery-редиректа или зависание до 60s | Сначала сброс `recovery_sent_at`, затем повтор |
| TC-3.9 нет `.leaflet-container` | Recovery-редирект или узкий viewport | Сброс recovery + в тесте desktop viewport 1280×800 |
