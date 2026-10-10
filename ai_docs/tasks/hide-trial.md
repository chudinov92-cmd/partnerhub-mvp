# Скрыть trial для пользователей

Статус: **выполнено** (2026-08-19).

## Что сделано

- [x] `TRIAL_ENABLED = false` в [`my-app/src/lib/subscriptionTrial.ts`](../../my-app/src/lib/subscriptionTrial.ts)
- [x] `POST /api/subscription/start-trial` → `410` «Пробный период больше недоступен»
- [x] Убран trial из `PaywallDrawer` (кнопка + копирайт «3 дня»)
- [x] Убран блок «Попробовать 3 дня» на `/subscription`
- [x] Удалён клиентский `startTrialSubscription()`

## Что не менялось

- Колонка `profiles.trial_used` и SQL `2026-08-11-subscription-trial.sql`
- Активный trial у существующих пользователей (`is_pro` + `pro_expires_at` в будущем)
- Админская воронка `trial_start` (исторические события)

## Проверка после деплоя

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
# деплой как обычно, SQL не нужен
```

- [ ] PaywallDrawer на карте — только «Выбрать тариф», без «3 дня»
- [ ] `/subscription` — нет блока «Попробовать 3 дня»
- [ ] `POST /api/subscription/start-trial` с cookie → 410
- [ ] Пользователь с активным trial до `pro_expires_at` — доступ как раньше

## Вернуть trial

В [`subscriptionTrial.ts`](../../my-app/src/lib/subscriptionTrial.ts) поставить `TRIAL_ENABLED = true` и восстановить UI в `PaywallDrawer` / `SubscriptionPlansView` из git history.
