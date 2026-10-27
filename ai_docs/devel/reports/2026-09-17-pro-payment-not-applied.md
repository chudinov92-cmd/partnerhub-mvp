# Инцидент: оплата Pro не активировала тариф (2026-09-17)

## Симптом

Пользователь оплатил тариф Pro, Success URL открылся, но в приложении остался Free.

| Поле | Значение |
|------|----------|
| `auth.users.id` | `827ce259-1869-414c-8ce0-2911a3206022` |
| Robokassa `InvId` | `965579733` |
| Тариф | Pro (месяц) |

## Причина

1. Webhook вызывает RPC `apply_robokassa_payment`, но миграция **не была на prod** и **не входила в** `deploy-app.sh` → Result URL `500 DB error`.
2. После первого наката RPC падала с `column reference "profile_id" is ambiguous`: OUT-колонка `profile_id` в `RETURNS TABLE` конфликтовала с `subscription_payments.profile_id` в `WHERE` (исправлено алиасом `sp.`).

## Исправление

1. В `2026-09-16-apply-robokassa-payment.sql` добавлен `notify pgrst, 'reload schema'`.
2. Миграция добавлена в `deploy-app.sh` (`apply-robokassa-payment`).
3. Инцидент-скрипт [`2026-09-17-activate-payment-965579733.sql`](../../../my-app/supabase/sql/2026-09-17-activate-payment-965579733.sql): вставка `pending` при отсутствии строки + `apply_robokassa_payment(965579733)`.

## Накат на prod

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
ssh root@186.246.2.104
cd /root/zeip/my-app
git pull
docker exec -i supabase-db psql -U supabase_admin -d postgres \
  < /root/zeip/my-app/supabase/sql/2026-09-16-apply-robokassa-payment.sql
docker exec -i supabase-db psql -U supabase_admin -d postgres \
  < /root/zeip/my-app/supabase/sql/2026-09-17-activate-payment-965579733.sql
```

Альтернатива: Supabase SQL Editor на https://supabase.zeip.ru — оба файла по порядку.

## Проверка после наката

```sql
select subscription_plan, is_pro, pro_expires_at
from public.profiles p
where p.auth_user_id = '827ce259-1869-414c-8ce0-2911a3206022'::uuid;

select status, paid_at, plan from public.subscription_payments where inv_id = 965579733;
```

Ожидаемо: `subscription_plan = pro`, `is_pro = true`, `pro_expires_at` ≈ +30 дней, `status = paid`.

Повтор webhook Robokassa для этого `InvId` после активации безопасен (идемпотентность → `already_paid`).

## Профилактика

- Не деплоить webhook с новым RPC до наката SQL.
- При каждом новом RPC — `notify pgrst, 'reload schema'` и строка в `deploy-app.sh`.
