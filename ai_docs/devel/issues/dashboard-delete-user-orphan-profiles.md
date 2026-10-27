# Dashboard «Delete user» не убирает профиль с карты (2026-09-07)

## Симптом

После удаления пользователя в Supabase Dashboard (**Authentication → Users → Delete user**) на карте остаются пины и профили. При повторных регистрациях с тем же email накапливается несколько видимых профилей.

Пример: `vova1992_92@mail.ru` — несколько пинов после удаления auth через Dashboard.

## Причина

1. FK `profiles.auth_user_id → auth.users(id)` с **`ON DELETE SET NULL`** ([`2026-07-21-account-settings.sql`](../../../my-app/supabase/sql/2026-07-21-account-settings.sql)).
2. Dashboard удаляет только `auth.users`; строка в `profiles` остаётся с `auth_user_id = null`, `deleted_at = null`, `map_visible = true`.
3. Карта ([`fetchProfilesForMap`](../../../my-app/src/services/profileService.ts)) фильтрует `deleted_at IS NULL` и `map_visible = true`; проверки `auth_user_id IS NOT NULL` нет.
4. Email в `profiles` не хранится — привязка только через `auth_user_id`.

## Правильный путь удаления

- **Пользователь:** `/settings` → «Удалить аккаунт» → `POST /api/v1/account/delete` (soft delete + скрытие с карты + `auth.admin.deleteUser`).
- **Админ / hard purge:** `/admin/users` или попап на карте (`super_admin`) → `/api/admin/users/purge`. См. [admin-moderation-purge.md](../features/admin-moderation-purge.md).
- **Админ / SQL по UUID или email:** только если UI недоступен.

См. [account-settings.md](../features/account-settings.md).

## Чистка данных

| Сценарий | Скрипт |
|---|---|
| Email + орфаны после Dashboard Delete | [`2026-09-07-purge-email-vova1992-orphans.sql`](../../../my-app/supabase/sql/2026-09-07-purge-email-vova1992-orphans.sql) |
| Только живой auth по email (без орфанов) | [`2026-08-22-purge-email-vova1992.sql`](../../../my-app/supabase/sql/2026-08-22-purge-email-vova1992.sql) |
| Hard delete по UUID | [`2026-08-22-delete-test-user-a02b5392.sql`](../../../my-app/supabase/sql/2026-08-22-delete-test-user-a02b5392.sql) (шаблон) |
| Hard delete `d9242af8-…` (2026-09-11) | [`2026-09-11-delete-user-d9242af8.sql`](../../../my-app/supabase/sql/2026-09-11-delete-user-d9242af8.sql) |
| Hard delete двух тест-аккаунтов для повторного онбординга (2026-09-16) | [`2026-09-16-delete-test-users-onboarding.sql`](../../../my-app/supabase/sql/2026-09-16-delete-test-users-onboarding.sql) |
| Сирота «Вовчик» на карте (`fd582634-…`, 2026-09-16) | [`2026-09-16-purge-orphan-vovchik.sql`](../../../my-app/supabase/sql/2026-09-16-purge-orphan-vovchik.sql) |

**Запуск (VPS):**

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
docker exec -i supabase-db psql -U supabase_admin -d postgres \
  < supabase/sql/2026-09-07-purge-email-vova1992-orphans.sql
```

Или SQL Editor: https://supabase.zeip.ru

## Рекомендация

Не использовать Dashboard **Delete user** для удаления с карты. Для support/admin — только API приложения или SQL purge.

## Связанные документы

- [account-settings.md](../features/account-settings.md)
- [profile-work-map-popup.md](../features/profile-work-map-popup.md)
