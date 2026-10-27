# Модерация: hard purge нарушителя

## Цель

Дать `super_admin` инструмент для **полного удаления** аккаунта нарушителя: профиль с карты, auth, связанные данные, бан email от повторной регистрации, письмо пользователю.

Это **не** self-service удаление из [`/settings`](../../../my-app/src/app/settings/page.tsx) (soft delete). См. [`account-settings.md`](account-settings.md).

## Доступ

| Роль | Возможности на `/admin/users` |
|------|-------------------------------|
| `support` | блокировка `is_blocked` |
| `super_admin` | hard purge + поиск по ссылке |

## UI

1. **`/admin/users`** — кнопка «Удалить нарушителя», поиск по ссылке/коду/UUID/email, кнопка «Удалить» в строке таблицы.
2. **Попап профиля на карте** — иконка «Модерация» (только `super_admin`, чужой профиль).

Компонент: [`ModerationPurgeDialog.tsx`](../../../my-app/src/components/admin/ModerationPurgeDialog.tsx).

## Поиск

Одно поле принимает:

| Ввод | Пример |
|------|--------|
| Шортлинк | `https://zeip.ru/p/Ab3xK9mn` |
| Длинная ссылка | `https://zeip.ru/map?profile=<uuid>` |
| UUID | `profiles.id` или `auth_user_id` или `auth.users.id` |
| Код (8 символов) | `Ab3xK9mn` |
| Email | `user@example.com` |

Парсер: [`profileShare.ts`](../../../my-app/src/lib/profileShare.ts) + RPC `resolve_profile_share_code`.

## API

| Метод | Путь | Роль |
|-------|------|------|
| GET | `/api/admin/users/lookup?query=` | `super_admin` |
| POST | `/api/admin/users/purge` | `super_admin` |

Тело purge:

```json
{
  "query": "https://zeip.ru/p/Ab3xK9mn",
  "confirm": "УДАЛИТЬ",
  "reason": "spam",
  "reason_note": "рассылка в ЛС",
  "send_email": true
}
```

Порядок: lookup → запрет себя/админа → **письмо до purge** (если `send_email`) → `account_bans` → RPC `admin_purge_account` → `auth.admin.deleteUser` → `admin_audit_log`.

## SQL

Миграция: [`2026-09-15-admin-moderation-purge.sql`](../../../my-app/supabase/sql/2026-09-15-admin-moderation-purge.sql)

- `account_bans` — бан email
- триггер `ACCOUNT_BANNED` на `auth.users` INSERT
- `admin_lookup_account_for_purge(uuid)`
- `admin_lookup_auth_user_id_by_email(text)`
- `admin_purge_account(uuid)`

**VPS:**

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
docker exec -i supabase-db psql -U supabase_admin -d postgres \
  < supabase/sql/2026-09-15-admin-moderation-purge.sql
```

Или через [`deploy-app.sh`](../../../my-app/deploy/timeweb/deploy-app.sh).

## Письмо

Тема: «Ваш профиль на Zeip удалён». Основание — п. 6.2–6.3 [`user-agreement.json`](../../../my-app/src/data/legal/user-agreement.json). CTA — `/terms/user-agreement`, контакт `support@zeip.ru`.

Если SMTP недоступен при `send_email: true` — purge **не выполняется**.

## Критерии готовности

- [x] Lookup по шортлинку, UUID, email
- [x] Purge только `super_admin`
- [x] Письмо до удаления
- [x] Бан email (`ACCOUNT_BANNED` на регистрации)
- [x] Аудит `profiles.moderation_purge`
- [x] Кнопка в попапе карты
