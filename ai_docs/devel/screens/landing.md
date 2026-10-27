# Экран: Маркетинговый лендинг (`/`)

## Цель

Публичная главная страница Zeip: объяснить продукт, показать механику и тарифы, привести к регистрации или на карту.

## Код

- [`my-app/src/app/(marketing)/page.tsx`](../../../my-app/src/app/(marketing)/page.tsx) — точка входа
- [`my-app/src/app/landing/pages/HomeLanding.tsx`](../../../my-app/src/app/landing/pages/HomeLanding.tsx) — композиция секций
- [`my-app/src/app/landing/landing.css`](../../../my-app/src/app/landing/landing.css) — стили лендинга

## Порядок секций

1. **Hero** — заголовок, подзаголовок, CTA
2. **StatsBar** — публичная статистика (если есть)
3. **FeatureSplit** — «В одиночку много не построить.»
4. **Mechanics** (`#how-it-works`) — «Механика» + зелёная полоса с 3 шагами
5. **FeatureSplit** — «Команда на расстоянии вытянутой руки»
6. **ShotGallery** — превью профилей (indigo-секция)
7. **FeatureSplit** — «От первого сообщения до общего проекта»
8. **FeatureSplit** — «Начни со своего двора, охвати всю страну»
9. **LandingPricing** — тарифы Free / Pro / Pro+
10. **FinalCta** — финальный призыв к действию
11. **Footer** — [`LandingFooter`](../../../my-app/src/app/landing/components/LandingFooter.tsx): юридические ссылки, `support@zeip.ru`, ООО «ЗЕИП» · ИНН 5906189643

## Hero CTA

| Состояние | Кнопка | Ссылка |
|-----------|--------|--------|
| Гость или cookie без профиля (после hard-delete) | Присоединиться | `/auth?mode=signup` |
| Авторизован, квиз не завершён, профиль есть | Продолжить | `/onboarding` |
| Авторизован, профиль на карте | На карту | `/map` |

«Войти» на лендинге больше не ведёт на `/onboarding`: leftover JWT после удаления аккаунта иначе крутит экран «Загрузка…».

**Клик «На карту» и middleware:** Hero определяет CTA на клиенте (`getSession` из cookie). Middleware на `GET /map` проверяет JWT через GoTrue (`getUser`). Если cookie есть, но сервер не видит user — редирект на `/auth?redirect=/map`, а не на лендинг (иначе цикл «На карту» → `/`). Настоящий гость без cookie по-прежнему уходит на `/`.

## Final CTA

- Заголовок: «Сделай первый шаг и заходи дальше»
- Кнопка: «Начать» → `/auth`

## Блок тарифов

Компонент [`LandingPricing.tsx`](../../../my-app/src/app/landing/components/LandingPricing.tsx):

- Три карточки: Free (0 ₽), Pro (249 ₽/мес), Pro+ (449 ₽/мес)
- Фичи и цены из [`subscriptionPlans.ts`](../../../my-app/src/lib/subscriptionPlans.ts), включая приоритет на карте и в фильтрах (Pro+ → Pro → Free)
- Без переключателя месяц/год и без оплаты на главной
- Free: «Начать бесплатно» → гость `/auth?mode=signup`, авторизован `/subscription`
- Pro / Pro+: «Выбрать» → гость `/auth?mode=signup&redirect=/subscription`, авторизован `/subscription`

## Edge cases

- `isPaidGateMode()` — в hero показывается подпись «Карту смотреть бесплатно · участие от 249 ₽ / 30 дней`
- Лендинг не требует авторизации; CTA определяется на клиенте через Supabase session
- **Cookie-баннер** ([`CookieBanner.tsx`](../../../my-app/src/components/CookieBanner.tsx)): только на лендинге (`footer.footer`) при прокрутке до низа баннер поднимается над футером и остаётся в щели между кнопкой «Начать» (FinalCta) и футером. Высота баннера публикуется в CSS-переменную `--cookie-banner-height`; секция `.section--darkCta` резервирует этот отступ. На остальных страницах баннер остаётся `fixed bottom-0`.
