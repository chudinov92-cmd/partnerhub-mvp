# Платный доступ (режим `paid_gate`)

## Статус

| Область | Статус |
|---------|--------|
| Флаг `NEXT_PUBLIC_ACCESS_MODE` | ✅ |
| Гость на `/map` | ❌ (middleware → `/` или `/auth`) |
| PaywallDrawer (DM / чат / пин / избранное) | ✅ |
| Trial 3 дня (`trial_used`) | скрыт (`TRIAL_ENABLED=false`, API → 410) |
| Soft-баннер 24ч после dismiss | ❌ (не реализован, код удалён) |
| Return `/payment/success` | ✅ |
| Aha после оплаты | ✅ (`/payment/success` → `/map?payment=success`) |
| Metrika reachGoal | ✅ |
| Стенд `test.zeip.ru` | ✅ (infra) |
| Prod `zeip.ru` | `paid_gate` (deploy: `scripts/vps/deploy-prod-paid-gate.sh`) |

## Матрица доступа (CJM)

**Источник лимитов тарифов:** [subscription-pro.md](subscription-pro.md) и константы в `my-app/src/lib/subscriptionPlans.ts` (`FREE_PROFILE_VIEWS_LIMIT=5`, `FREE_FAVORITES_LIMIT=5`, `PRO_DM_LIMIT=10`, `PRO_PLUS_DM_LIMIT=30`, `PRO_PLUS_CHAT_LIMIT=10`).

Полная матрица тарифов и цены — [subscription-pro.md](subscription-pro.md).

### A. Доступ к `/map` (login-wall, вне тарифов)

| Кто | `/map` |
|-----|--------|
| Гость (нет сессии) | **нет** — redirect на `/`; share `?profile=` → `/auth?redirect=...` |
| Authed (любой тариф) | да |

Реализация: `my-app/src/middleware.ts`.

> **Решение (2026-08):** guest AuthGate и лимит 5 попапов без логина **намеренно не используются**. Исторический worktree `Downloads/Zeip Paid` устарел; guest CJM оттуда не переносится в main.

### B. Лимиты по тарифам (после входа, режим `paid_gate`)

| | Free (0 ₽) | Pro (249 ₽/мес) | Pro+ (449 ₽/мес) |
|---|---|---|---|
| **Просмотр профилей** | до **5 в сутки** | без лимита | без лимита |
| **Избранное** | до **5 контактов** | без лимита | без лимита |
| **Общий чат** | только чтение | только чтение | до **10 сообщений/сутки** |
| **Личные сообщения** | — | до **10 собеседников/сутки** | до **30 собеседников/сутки** |
| **Свой пин на карте** | да (зелёный) | да (жёлтый) | да (фиолетовый) |

Активная подписка: `profiles.subscription_plan IN ('pro','pro_plus')`, `profiles.is_pro = true` и (`pro_expires_at` пусто или в будущем).

**Trial (скрыт с 2026-08-19):** флаг `TRIAL_ENABLED=false` в `src/lib/subscriptionTrial.ts`. UI без CTA «3 дня»; `POST /api/subscription/start-trial` → `410`. У пользователей с уже активным trial (`is_pro` + `pro_expires_at` в будущем) доступ сохраняется до истечения. Колонка `trial_used` в БД остаётся.

### C. Enforcement в коде (`paid_gate`, тариф Free)

| Лимит Free | UI / механизм | Файл |
|---|---|---|
| 5 просмотров/сутки | `unpaidPinViews` → 6-й попап → `PinLimitModal` | `unpaidPinViews.ts`, `map/page.tsx` |
| 5 избранных | PaywallDrawer `intent=favorites_limit` | `useContacts.ts` |
| DM недоступны | «Написать» → PaywallDrawer `intent=dm`; в существующем ЛС — плашка + Link `/subscription?reason=dm` | `useChatHandlers.ts`, `ChatDialog.tsx` |
| Чат только чтение | заглушка + Link `/subscription?reason=chat` (нужен Pro+). Пока сессия/тариф не готовы (`currentUserReady=false`) — скелетон композера, не поле ввода | `FeedColumn.tsx`, `useAuth.ts` |

Pro / Pro+ — лимиты DM и чата через `getDmPartnersDailyLimit`, `canWriteGeneralChat`, RLS (`2026-08-17-subscription-tiers.sql`).

## Paywall-точки

Intents для **authed без платной подписки (тариф Free)**:

| Intent | Триггер | UI |
|--------|---------|-----|
| `dm` | «Написать» / новый диалог | PaywallDrawer |
| `dm` | CTA «Оформить Pro» в существующем ЛС | Link `/subscription?reason=dm` (без drawer, без 24ч-капа) |
| `chat` | CTA «Оформить Pro+» в блоке общего чата | Link `/subscription?reason=chat` (нужен Pro+; без drawer, без 24ч-капа) |
| `favorites_limit` | 6-й контакт в избранном | PaywallDrawer |
| *(не intent)* | 6-й просмотр профиля/сутки (Free) | `PinLimitModal` |

После dismiss drawer: повтор **мягких автопоказов** (`dm` с «Написать», `pin`, `banner`) не чаще 1 раза / 24ч (`paywallFrequency.ts`). Жёсткие лимиты `view_limit` и `favorites_limit` кап не применяют — без UI пользователь не может продолжить. Явные CTA в композере чата/ЛС **всегда** ведут на `/subscription`.

## Return после Robokassa (`/payment/success`)

| Шаг | Поведение |
|-----|-----------|
| Success URL | `https://{host}/payment/success` (+ query `InvId`, `OutSum` от Robokassa) |
| Fail URL | `https://{host}/payment/fail` |
| Legacy | `/subscription?InvId=...` → redirect на `/payment/success` |
| Poll | `GET /api/subscription/payment-status?invId=` + `getSubscriptionStatus`, до 30 сек |
| Без сессии | «Оплата получена. Войдите…» → `/auth?redirect=/payment/success?InvId=...` |
| paid_gate success CTA | `/map?payment=success` → resume intent из `paywallIntent` sessionStorage |
| prod freemium success CTA | `/map` |

Webhook (Result URL) по-прежнему единственный источник истины для `is_pro`.

После оплаты: `/payment/success` → «Продолжить» → toast/resume на `/map`.

## Код (`my-app`)

| Файл | Назначение |
|------|------------|
| `src/middleware.ts` | Hard login-wall для `/map` |
| `src/hooks/useAuth.ts` | Параллельно карта + сессия; `currentUserReady` до показа тарифного UI |
| `src/app/map/components/FeedColumn.tsx` | Скелетон композера, пока тариф неизвестен |
| `src/components/OnboardingPaywallBanner.tsx` | Слот баннера: скелетон → живой баннер для Free/Pro |
| `src/lib/accessMode.ts` | `isPaidGateMode` |
| `src/lib/unpaidPinViews.ts` | Лимит 5 просмотров/сутки (Free, paid_gate) |
| `src/lib/paywallIntent.ts` | intent, `write=`, sessionStorage pending |
| `src/lib/paywallFrequency.ts` | dismiss 24ч по intent |
| `src/lib/paywallAnalytics.ts` | Metrika goals + paywall events API |
| `src/components/PinLimitModal.tsx` | 6-й просмотр профиля (Free) |
| `src/components/PaywallDrawer.tsx` | Оплата / поддержка |
| `src/components/PaymentSuccessToast.tsx` | Aha toast на `/map?payment=success` |
| `src/components/PaymentSuccessView.tsx` | Экран успеха после Robokassa |
| `src/app/payment/success/page.tsx` | Success URL landing |
| `src/app/payment/fail/page.tsx` | Fail URL landing |
| `src/lib/paymentReturn.ts` | InvId, legacy redirect, sessionStorage |
| `src/lib/paymentAnalytics.ts` | Metrika: payment_success_* |
| `src/app/api/subscription/payment-status/route.ts` | Poll статуса платежа |
| `src/lib/subscriptionTrial.ts` | `TRIAL_ENABLED` — вкл/выкл trial |
| `src/app/api/subscription/start-trial/route.ts` | Trial API (410 при `TRIAL_ENABLED=false`) |
| `supabase/sql/2026-08-11-subscription-trial.sql` | Колонка `trial_used` |

## UX: сохранение профиля (`/profile`)

После **«Сохранить профиль»** — `ProfileSaveFeedbackBar`: успех + hint про **личные сообщения** (не про видимость пина), если точка указана без оплаты. Пин Free уже виден на карте; paywall — на DM.

Янтарная плашка на `/profile` (Free, `paid_gate`): «пин уже виден, личные сообщения — после оплаты».

## SQL (Supabase)

```sql
alter table public.profiles
  add column if not exists trial_used boolean not null default false;

comment on column public.profiles.trial_used is
  'paid_gate: one-time 3-day trial already consumed';
```

## Локальная разработка

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
# NEXT_PUBLIC_ACCESS_MODE=paid_gate в .env.local
npm run dev
```

## Связанные документы

- [cjm-paywall-implementation.md](../../tasks/cjm-paywall-implementation.md)
- [subscription-pro.md](subscription-pro.md)
- [subscription.md](../screens/subscription.md)
- [test-domain-paid-stand.md](../../tasks/test-domain-paid-stand.md)
