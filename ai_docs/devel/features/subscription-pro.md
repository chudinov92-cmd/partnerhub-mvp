# Тарифы подписок: Free / Pro / Pro+

## Статус реализации

| Область | Статус |
|---------|--------|
| Страница `/subscription`, 3 тарифа + toggle мес/год | ✅ |
| Поля `profiles.subscription_plan`, `is_pro`, `pro_expires_at` | ✅ (миграция `2026-08-17-subscription-tiers.sql`) |
| Оплата Robokassa: 4 plan id (pro/pro_plus × monthly/yearly) | ✅ |
| Лимиты Free: 5 просмотров/сутки, 5 избранных | ✅ UI + RLS |
| Лимиты Pro: DM 10/сутки, чат только чтение | ✅ |
| Лимиты Pro+: DM 30/сутки, чат 10/сутки | ✅ UI + RLS |
| Ранжирование на карте и в фильтрах: Pro+ → Pro → Free | ✅ UI |
| Trial 3 дня → тариф Pro | скрыт (`TRIAL_ENABLED=false`) |

---

## Матрица тарифов

| | Free | Pro (249 ₽/мес) | Pro+ (449 ₽/мес) |
|---|---|---|---|
| Просмотр профилей | до 5 в сутки | без лимита | без лимита |
| Избранное | до 5 контактов | без лимита | без лимита |
| Общий чат | только чтение | только чтение | до 10 сообщений/сутки |
| Личные сообщения | — | до 10 собеседников/сутки | до 30 собеседников/сутки |
| Пин на карте | да (зелёный) | да (жёлтый) | да (фиолетовый) |
| Приоритет на карте и в фильтрах | ниже Pro / Pro+ | выше Free | выше всех |

**Свой пин:** белая заливка, обводка / буква / ножка — цветом тарифа (см. `getPinColorForPlan` в `PartnerMap.tsx`). При фокусе — янтарная обводка.

**Z-order пинов на карте:** focused (открытый чужой профиль) → свой пин → совпадение профессии → тариф → непросмотренные → рейтинг. Hover-тултип выше всех пинов.

**Годовые тарифы (−20%):** Pro — 2390 ₽/год, Pro+ — 4310 ₽/год.

---

## Копирайт (UI)

- **Free** — «Знакомство с сетью»
- **Pro** — «Активный нетворкинг»
- **Pro+** — «Максимальный охват»

**Отображение текущего тарифа:** справа от заголовка «Мой профиль» на `/profile` и справа от имени в TopBar (desktop). Подпись — `getPlanLabel`, цвет текста — `getPlanTextColor` в `subscriptionPlans.ts` (Free — зелёный, Pro — amber-600, Pro+ — фиолетовый). Эффективный тариф — `getEffectiveSubscriptionPlan`.

---

## Код (`my-app`)

| Файл | Назначение |
|------|------------|
| [`src/lib/subscriptionPlans.ts`](../../../my-app/src/lib/subscriptionPlans.ts) | Цены, plan id, копирайт фич, `comparePlanRank` |
| [`src/components/PartnerMap.tsx`](../../../my-app/src/components/PartnerMap.tsx) | Z-index и порядок пинов по тарифу |
| [`src/app/map/page.tsx`](../../../my-app/src/app/map/page.tsx) | Сортировка списка «Профили» после фильтров |
| [`src/app/subscription/SubscriptionPlansView.tsx`](../../../my-app/src/app/subscription/SubscriptionPlansView.tsx) | UI 3 карточек + toggle |
| [`src/services/subscriptionService.ts`](../../../my-app/src/services/subscriptionService.ts) | Статус, лимиты, initRobokassaPayment |
| [`src/app/api/subscription/create-payment/route.ts`](../../../my-app/src/app/api/subscription/create-payment/route.ts) | Создание платежа |
| [`src/app/api/subscription/webhook/route.ts`](../../../my-app/src/app/api/subscription/webhook/route.ts) | Активация после оплаты |

Активная подписка: `subscription_plan IN ('pro','pro_plus')` и `pro_expires_at` в будущем. Поле `is_pro` синхронизируется триггером.

---

## База данных

Миграция: [`my-app/supabase/sql/2026-08-17-subscription-tiers.sql`](../../../my-app/supabase/sql/2026-08-17-subscription-tiers.sql)

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
ssh root@<VPS_IP>
docker exec -i supabase-db psql -U supabase_admin -d postgres \
  < /root/zeip/my-app/supabase/sql/2026-08-17-subscription-tiers.sql
```

---

## Связанные документы

- [`subscription-paid-access.md`](subscription-paid-access.md) — режим paid_gate
- [`screens/subscription.md`](../screens/subscription.md)
