# Онбординг-квиз и новая воронка

**Статус:** реализовано (2026-08-13), акция пионеров управляется из админки (2026-09-16)

## Поток

1. Регистрация → письмо → `/auth/callback` (сессия) → `/onboarding`
2. Квиз 4 шага → `/map`
3. Unpaid: 5 попапов профилей/день → `PinLimitModal` → `/subscription`
4. Unpaid: баннер «249 ₽» на карте → `PaywallDrawer`

**Z-order на карте:** панель «Поиск специалистов» (`z-[1300]`) выше баннера подписки (`z-[1250]`); высота баннера учитывается в CSS-переменной `--zeip-paywall-banner-height`.

5. **Пионерская акция** (вкл/выкл из `/admin/promo`, таблица `pioneer_promo_settings`): первые в городе после квиза → `claim_pioneer_slot` → 90 дней **Pro+** (`subscription_plan = pro_plus`) → `PioneerModal`. Лимит слотов: **Пермь 100**, остальные города **50** (пока админ не изменит `city_pioneer_slots.max_count`). Аккаунты старше cutoff `2026-08-13` слот не получают. По умолчанию акция **выключена**.

## Матрица доступа

| Кто | Карта | Попапы | DM / чат |
|-----|-------|--------|----------|
| Гость (нет cookie сессии) | ❌ → `/` | — | — |
| Cookie есть, но JWT битый/протух | ❌ → `/auth?redirect=/map` | — | — |
| Authed, квиз не пройден | ❌ → `/onboarding` | — | — |
| Authed, unpaid | ✅ | 5/день | PaywallDrawer |
| Authed, paid / пионер (Pro+) | ✅ | без лимита | ✅ (как Pro+) |

## SQL

- [`2026-08-13-onboarding-funnel.sql`](../../../my-app/supabase/sql/2026-08-13-onboarding-funnel.sql)
- [`2026-08-13-email-cron.sql`](../../../my-app/supabase/sql/2026-08-13-email-cron.sql)
- [`2026-08-17-disable-pioneer-promo.sql`](../../../my-app/supabase/sql/2026-08-17-disable-pioneer-promo.sql) — исторический kill switch (константа в функции)
- [`2026-09-16-pioneer-promo-admin.sql`](../../../my-app/supabase/sql/2026-09-16-pioneer-promo-admin.sql) — тумблер в БД, Pro+, лимит Перми 100

Экран: [onboarding-quiz.md](../screens/onboarding-quiz.md)

## Код

| Файл | Назначение |
|------|------------|
| `src/app/auth/callback/page.tsx` | Callback после письма подтверждения |
| `src/lib/authEmailCallback.ts` | Разбор URL, setSession / exchangeCode |
| `src/app/onboarding/page.tsx` | 4-шаговый квиз (UI: mobile first) |
| `src/lib/unpaidPinViews.ts` | Лимит 5 попапов (localStorage) |
| `src/components/PinLimitModal.tsx` | Модал при лимите |
| `src/components/OnboardingPaywallBanner.tsx` | Sticky-баннер на карте (`OnboardingPaywallBannerSlot`); пока тариф неизвестен — скелетон той же высоты; публикует `--zeip-paywall-banner-height` |
| `src/components/PioneerModal.tsx` | Попап пионера (Pro+ 90 дней) |
| `src/app/admin/promo/page.tsx` | Тумблер акции и лимиты слотов (super_admin) |
| `src/lib/pioneerPromo.ts` | `fetchPioneerPromoEnabled()` из `pioneer_promo_settings` |
| `src/components/ConditionalTopBar.tsx` | TopBar скрыт на `/onboarding` |
| `src/middleware.ts` | Login-wall `/map`: гость → `/`; cookie без user → `/auth?redirect=/map`; сбой GoTrue + cookie → fail-open на карту |
| `src/app/api/email/paywall-reminder/route.ts` | Email 48ч+ unpaid |
| `src/app/api/email/pioneer-expiry/route.ts` | Email за 7 дней до конца Pro |

## Env для email cron

```
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_ADMIN_EMAIL, SMTP_SENDER_NAME
INTERNAL_EMAIL_SECRET  # или INTERNAL_PUSH_SECRET
```

Запуск SQL в Supabase:

```bash
cd "/Users/vladimirchudinov/Desktop/my-startup/my-app"
# Выполнить содержимое supabase/sql/2026-09-16-pioneer-promo-admin.sql
```

Прод:

```bash
ssh root@186.246.2.104
docker exec -i supabase-db psql -U supabase_admin -d postgres \
  < /root/zeip/my-app/supabase/sql/2026-09-16-pioneer-promo-admin.sql
```
