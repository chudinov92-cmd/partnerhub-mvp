# Настройки аккаунта (`/settings`)

## Цель

Страница для управления доступом и приватностью без смешивания с формой `/profile`.

## Пункт меню

TopBar (authed) → **Настройки** → `/settings` (после «Профиль»).

## Блоки (сверху вниз)

1. **Уведомления** — Web Push (`PushNotificationsSettings`, перенесено с `/profile`).
2. **Видимость на карте** — `profiles.map_visible` + синхронизация `locations.is_active`.
3. **Изменить email** — `supabase.auth.updateUser({ email })` + письмо подтверждения.
4. **Изменить пароль** — проверка текущего через `signInWithPassword`, затем `updateUser({ password })`.
5. **Подписка Pro** — статус + ссылка на `/subscription`.
6. **Документы** — ссылки на `/terms/*` и `/personal-data`.
7. **Удалить аккаунт** — soft delete + удаление auth.

## Удаление аккаунта

- UI: подтверждение текстом `УДАЛИТЬ` + `confirm`.
- API: `POST /api/v1/account/delete` (cookie session + `service_role`).
- Soft delete: `profiles.deleted_at`, `full_name = «Удалённый пользователь»`, обнуление ПД, `map_visible = false`, `auth_user_id = null`.
- `locations.is_active = false`, удаление `profile_private`, `push_subscriptions`.
- `auth.admin.deleteUser`.
- Чаты/сообщения **оставляем**; отображаемое имя — «Удалённый пользователь».
- `subscription_payments` **не удаляем**.

**Админский hard purge** (нарушители): только `super_admin`, полное удаление + бан email + письмо. См. [admin-moderation-purge.md](admin-moderation-purge.md). Не путать с self-service выше.

## SQL

`my-app/supabase/sql/2026-07-21-account-settings.sql` (включён в `deploy/timeweb/deploy-app.sh`).

## Критерии готовности

- [x] Пункт «Настройки» в TopBar.
- [x] Push только на `/settings` (не на `/profile`).
- [x] Скрытие с карты при `map_visible = false`.
- [x] Удаление: нет входа, профиль не на карте, в чатах «Удалённый пользователь».
