# API: события воронки пейвола

## POST `/api/analytics/paywall-event`

Best-effort логирование шага воронки. Только авторизованные пользователи с профилем.

**Body:**

```json
{
  "event_type": "shown",
  "intent": "dm",
  "plan": "pro",
  "period": "monthly"
}
```

| Поле | Обязательно | Значения |
|---|---|---|
| `event_type` | да | `shown`, `dismissed`, `cta_buy`, `trial_start`, `checkout_started`, `payment_success` |
| `intent` | нет | `PaywallIntent` (строка) |
| `plan` | нет | `pro`, `pro_plus` |
| `period` | нет | `monthly`, `yearly` |

**Логика:**

1. Сессия через cookie (`createSupabaseRouteClient`)
2. Нет user / нет profile → `{ ok: true }` без insert
3. Из `profiles`: `city`, `subscription_plan`
4. Insert в `paywall_events` через `service_role`

**Ответ:** `{ ok: true }` или `{ error: "..." }` (400/500).

Клиент: `fetch` с `keepalive: true`, ошибки не ломают UX.

---

## GET `/api/admin/analytics/paywall-funnel`

Только admin (`support+`).

**Query:** `from`, `to` — `YYYY-MM-DD`.

**Ответ:**

```json
{
  "steps": [
    { "event_type": "shown", "cnt": 120, "unique_users": 85 }
  ],
  "shownToCtaPct": 12.5,
  "shownToPaidPct": 3.2,
  "intents": [
    { "intent": "dm", "shown_cnt": 45 }
  ]
}
```

RPC: `get_paywall_funnel(p_from timestamptz, p_to timestamptz)`.
