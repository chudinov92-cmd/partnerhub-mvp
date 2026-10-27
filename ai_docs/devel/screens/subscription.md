# Экран: Тарифные планы (`/subscription`)

## Цель

Сравнение **Free**, **Pro** и **Pro+**; оплата через Robokassa (месяц / год).

**Paid gate (`paid_gate`, стенд test.zeip.ru):** один тариф подписки — доступ к участию в сети (см. [subscription-paid-access.md](../features/subscription-paid-access.md)).

## Доступ

- URL: `/subscription`
- Требуется авторизация: без сессии редирект на `/auth`
- Вход из меню: TopBar → аватар → **PRO · Подписка**

## Макет и стили

- Фон: `bg-gradient-to-br from-gray-50 via-emerald-50/30` (как `/auth`, `/profile`)
- Контейнер: `max-w-5xl`, заголовок «Тарифные планы»
- Три карточки в сетке `md:grid-cols-3`:
  - **Free** — рамка `#10B981`
  - **Pro** — рамка `#FDE047`, бейдж **PRO**
  - **Pro+** — рамка `#6466FA`, бейдж **PRO+**
- Toggle месяц / год (−20% на год)

## Состояния UI

| Состояние | Поведение |
|-----------|-----------|
| `loading` | Три skeleton-блока вместо карточек |
| Гость | Редирект на `/auth` (до отрисовки тарифов) |
| Free | Карточки Pro / Pro+ с кнопками покупки |
| Pro активен | Баннер с датой; апгрейд до Pro+ или отмена |
| Pro+ активен | Баннер «Подписка Pro+ активна» |
| Ошибка | Красный alert над карточками (оплата, RLS, сеть) |

## Элементы карточек

Фичи из [`subscriptionPlans.ts`](../../../my-app/src/lib/subscriptionPlans.ts):

- **Free** — лимиты просмотров и избранного, чтение чата, приоритет на карте ниже Pro / Pro+, пин зелёный
- **Pro** — без лимитов просмотра и избранного, DM до 10/сутки, приоритет выше Free, пин жёлтый
- **Pro+** — без лимитов просмотра и избранного, чат до 10/сутки, DM до 30/сутки, приоритет выше всех, пин фиолетовый

## Ранжирование на карте

На `/map` пины и список «Профили» после фильтров сортируются: **Pro+ → Pro → Free**, затем рейтинг. При фильтре по профессии — сначала основная профессия, затем тариф.

## Действия пользователя

- **Купить Pro / Pro+** → `initRobokassaPayment` → redirect на Robokassa
- **Апгрейд Pro → Pro+** → пропорциональная доплата
- **Отменить подписку** → `cancelProSubscription`

Пробный период 3 дня **не показывается** (см. [hide-trial.md](../../tasks/hide-trial.md)).

## Edge cases

- Профиль не найден по `auth_user_id` — сообщение «Завершите регистрацию».
- `pro_expires_at` в прошлом при `is_pro=true` — сервис считает тариф Free (истёкшая подписка).

## Код

- [`my-app/src/app/subscription/page.tsx`](../../../my-app/src/app/subscription/page.tsx)
- [`my-app/src/app/subscription/SubscriptionPlansView.tsx`](../../../my-app/src/app/subscription/SubscriptionPlansView.tsx)
