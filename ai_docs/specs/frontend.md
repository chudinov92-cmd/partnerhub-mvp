# Фронтенд Zeip

## Стек
- **Next.js 16** (App Router, `app/`)
- **React 19** + **TypeScript** + **Tailwind CSS**
- **@supabase/ssr** — серверные клиенты, middleware
- **react-leaflet** — карта (только клиент, `ssr: false`)
- **fuse.js** — клиентский поиск
- **web-push** — VAPID (сервер)

## Структура страниц (App Router)

| Путь | Страница | Описание |
|------|----------|----------|
| `/` | Маркетинговый лендинг | Public: Hero, механика, тарифы, CTA |
| `/auth` | Авторизация | Вход, регистрация, OTP, сброс пароля |
| `/auth/reset-password` | Сброс пароля | OTP + новый пароль |
| `/map` | Главная (карта) | Карта, лента, ЛС, профили, контакты. Требует авторизацию (middleware) |
| `/profile` | Редактор профиля | Форма профиля, гео, доп. профессии |
| `/onboarding` | Онбординг-квиз | Быстрое заполнение профиля |
| `/subscription` | Тарифные планы | Free / Pro / Pro+ с оплатой |
| `/payment/success` | Успех оплаты | Landing после Robokassa |
| `/payment/fail` | Ошибка оплаты | Landing при отмене |
| `/settings` | Настройки | Смена пароля, удаление аккаунта |
| `/admin/*` | Админ-панель | Пользователи, модерация, каталоги, аналитика (RBAC support/super_admin) |
| `/terms/*` | Юридические страницы | Пользовательское соглашение, политика обработки данных |
| `/p/[code]` | Шортлинк профиля | Редирект на `/map?profile=...` |

## Ключевые контексты

### `SelectedCityContext`
- Хранит выбранный город в `localStorage.selected_city` (для карты и общего чата).
- Применяется в `TopBarCitySelect`, `PartnerMap`, `FeedColumn`.
- Для авторизованных — синхронизация с `profiles.city` при логине.

## Middleware (`my-app/src/middleware.ts`)

Последовательность:
1. **CSP nonce** — генерирует nonce на каждый HTML-запрос, применяет `Content-Security-Policy` с `strict-dynamic`.
2. **Security headers** — HSTS, X-Frame-Options, nosniff.
3. **Auth guard**:
   - `/map`, `/map/*` — только authenticated. Гость → `/` (лендинг). Битая сессия → `/auth?redirect=/map`.
   - `/admin/*` — authenticated + `admin_users`. Без прав → 403.
   - `/payment/success`, `/payment/fail` — пропускает без проверки (для Robokassa redirect).

Подробнее: `ai_docs/devel/features/content-security-policy.md`.

## CSP (Content-Security-Policy)

- Nonce на каждый HTML-запрос (через middleware + `layout.tsx` с `dynamic = force-dynamic`).
- `strict-dynamic` для динамических скриптов (Метрика, VK Pixel).
- sha256 для фиксированных inline-скриптов (recovery-редирект, JSON-LD).
- `style-src 'unsafe-inline'` — React `style={{}}`.
- `unsafe-eval` — только development.
- Allowlist: `script-src: mc.yandex.ru, top-fwz1.mail.ru, googletagmanager.com`; `connect-src: supabase.zeip.ru, maps.vk.com`; `form-action: auth.robokassa.ru`.

Подробнее: `ai_docs/devel/features/content-security-policy.md`.

## Ключевые компоненты

| Компонент | Назначение | Источник |
|-----------|------------|----------|
| `PartnerMap` | Карта с пинами (react-leaflet, клиент) | `@my-startup/map-ui` |
| `ProfilePreviewCard` | Popup профиля на карте / в чате | `@my-startup/profile` |
| `ChatDialog` | ЛС (overlay на мобилке, панель на десктопе) | `my-app/app/map/components` |
| `ChatsColumn` | Список «Мои чаты» | `my-app/app/map/components` |
| `FeedColumn` | Лента общего чата | `my-app/app/map/components` |
| `TopBar` | Верхняя навигация (лого, город, контакты, аватар) | `my-app/components` |
| `PaywallDrawer` | Оплата / поддержка | `my-app/components` |
| `CookieBanner` | Согласие на cookie | `my-app/components` |
| `MobileSelectSheet` | Единый picker для мобилок (город, профессия, фильтры) | `my-app/components/select` |

## Сервисный слой

Страницы используют функции из `src/services/*` (barrel-реэкспорты библиотек):
- `profileService.ts` → `@my-startup/profile`
- `contactService.ts` → `@my-startup/profile`
- `chatService.ts` → `@my-startup/chat`
- `adminService.ts` → `my-app` (локальный)

API-роуты (`app/api/*`) используют `createSupabaseAdmin()` из `@my-startup/auth`.

Подробнее: `ai_docs/devel/components/services-layer.md`.

## Ключевые хуки

| Хук | Назначение | Источник |
|-----|------------|----------|
| `useAuth` | Сессия, статус авторизации | `my-app/hooks` |
| `useProfiles` | Справочники профессий/отраслей | `@my-startup/profile` |
| `useContacts` | Избранное, блокировки | `@my-startup/profile` |
| `useChat` / `useChatMessagesRealtime` | Чаты, realtime | `my-app/hooks` / `@my-startup/chat` |
| `useIsLgUp` | Брейкпоинт 1024px | `@my-startup/hooks` |
| `useMobileKeyboardInset` | Клавиатура на мобилках | `@my-startup/hooks` (из `my-app`)<!--fix----> |

## Аналитика и трекинг

- **Яндекс.Метрика**: `initYandexMetrika`, цели через `reachYandexMetrikaGoal`.
- **VK Pixel (Top.Mail.Ru)**: `initVkPixel`.
- **Paywall-аналитика**: события показа/CTA/оплаты.
- Библиотека: `@my-startup/analytics`.

Подробнее: `libs/analytics/src/index.ts`.