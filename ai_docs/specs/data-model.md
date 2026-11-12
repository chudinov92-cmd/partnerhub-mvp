# Модель данных (Supabase PostgreSQL)

## Соглашения

- Все публичные таблицы — в схеме `public`.
- Аутентификация — стандартная схема `auth` (Supabase Auth).
- RLS (Row-Level Security) включена для всех публичных таблиц.
- Миграции хранятся в `my-app/supabase/sql/` (именованные по дате).

## Auth

### `auth.users` (Supabase)
- `id uuid` — primary key.
- `email text` — email пользователя (уникальный).
- Стандартные поля Supabase Auth: `encrypted_password`, `confirmed_at`, `email_change`, `recovery_token` и т.д.

## Профили

### `public.profiles`
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | `uuid PK` | Публичный ID профиля (deeplink `/map?profile=id`, legacy `/profiles/[id]`) |
| `auth_user_id` | `uuid UNIQUE → auth.users.id` | Связь с auth |
| `full_name` | `text` | Имя (публичное) |
| `country` | `text` DEFAULT `'Россия'` | Страна (не редактируется в UI) |
| `city` | `text` | Город из профиля |
| `avatar_url` | `text` | Аватар (пока не используется) |
| `industry` | `text` | Отрасль (справочник `industry_catalog`) |
| `industry_other` | `text` | Ручной ввод отрасли (если `industry = 'Другое'`) |
| `subindustry` | `text` | Подотрасль (из `subindustry_catalog`) |
| `role_title` | `text` | Профессия (UI-название) |
| `current_status` | `text` | Статус: Учащийся / Сотрудник в компании / Предприниматель / Фрилансер |
| `experience_years` | `int4` | Стаж |
| `skills` | `text` | «О себе» |
| `looking_for` / `can_help_with` / `interested_in` | `text` | Legacy (скрыты из UI, в БД остались) |
| `last_seen_at` | `timestamptz` | Последняя активность (онлайн-статус) |
| `content_updated_at` | `timestamptz` | Версия контента профиля (для сброса «просмотренного» пина) |
| `rating_count` | `int4` DEFAULT `0` | Баллы рейтинга |
| `subscription_plan` | `text` DEFAULT `'free'` | Тариф: free / pro / pro_plus |
| `is_pro` | `boolean` DEFAULT `false` | Флаг активной подписки (синхронизируется триггером) |
| `pro_expires_at` | `timestamptz` | Дата истечения подписки |
| `trial_used` | `boolean` DEFAULT `false` | Флаг использования пробного периода (скрыт) |
| `is_blocked` | `boolean` DEFAULT `false` | Блокировка модератором |

**RLS:** SELECT для всех; INSERT для authenticated (`auth_user_id = auth.uid()`); UPDATE — владелец или админ; DELETE — владелец или super_admin (purge).

### `public.profile_private`
- `profile_id uuid PK → profiles.id`, `last_name text` — фамилия (приватная, RLS только владелец).

### `public.profile_work`
- Блоки «Дополнительные профессии»: `role_title`, `industry`, `subindustry`, `current_status`, `experience_years`, `sort_order`, `updated_at`
- RLS: SELECT для всех (публично в попапе), INSERT/UPDATE/DELETE — владелец.

### `public.locations`
| Поле | Описание |
|------|----------|
| `id` | `uuid PK` — маркер |
| `user_id` | `uuid → profiles.id` |
| `lat`, `lng` | Точные координаты (обфусцируются на карте ~250 м) |
| `city` | `text` |
| `is_active` | `boolean` |

- RLS: SELECT для всех; INSERT/UPDATE — владелец.
## Чат

### `public.posts` (Общий чат)
| Поле | Описание |
|------|----------|
| `id` | `uuid PK` |
| `author_id` | `uuid → profiles.id` |
| `title` | `text` — сейчас всегда «Общий чат» |
| `body` | `text` — сообщение (лимит 1000 символов UI) |
| `city` | `text` — комната чата (выбранный город или «Россия») |
| `created_at` | `timestamptz` |

- RLS: SELECT для всех; INSERT для authenticated (не заблокирован).
- Мат маскируется триггером `trg_posts_mask_profanity`.
- DELETE: автор (RLS, миграция `2026-09-04-delete-own-messages`).

### `public.post_comments`
- `id`, `post_id → posts(id) ON DELETE CASCADE`, `author_id → profiles(id)`, `body` (до 1000), `created_at`
- RLS: SELECT для всех; INSERT для authenticated (не заблокирован).
- Мат маскируется триггером `trg_post_comments_mask_profanity`.

### `public.messages` (Личные сообщения)
- `id uuid PK`, `chat_id uuid → chats.id`, `author_id uuid → profiles.id`, `body text`, `created_at timestamptz`
- RLS: SELECT если участник чата (`chat_members`); INSERT — участник, не заблокирован, соблюдены лимиты тарифа.
- DELETE: отправитель (RLS).
- Realtime включён.

### `public.chats` / `public.chat_members`
- `chats (id, created_at, updated_at)`
- `chat_members (chat_id, profile_id, last_read_at)` — last_read_at для подсчёта непрочитанных.
- RLS: SELECT если участник.

## Подписки и платежи

### `public.subscription_payments`
- `id uuid PK`, `profile_id uuid → profiles.id`, `plan text`, `period text`, `status text` (pending/paid/...), `amount numeric`, `inv_id int4`, `created_at`, `period_start`, `period_end`

### `public.app_config`
- `key text PK`, `value text` — настройки (push_dispatch_url, push_internal_secret и др.)

## Справочники

### `public.industry_catalog` / `public.subindustry_catalog` / `public.profession_catalog`
- Отрасли, подотрасли и профессии. Пополняются при выборе «Другое».
- Стратегия кэширования: DB-first → localStorage → fallback.

## Контакты и блокировки

### `public.profile_contacts`
- `owner_id`, `contact_profile_id` — избранное. RLS: владелец.

### `public.profile_blocks`
- `owner_id`, `blocked_profile_id` — блокировка. RLS: владелец.

### `public.profile_views`
- `viewer_profile_id`, `viewed_profile_id`, `viewed_content_updated_at` — просмотренные пины.

## Администрирование

### `public.admin_users`
- `id uuid PK`, `auth_user_id uuid → auth.users.id`, `role text` (support/super_admin), `created_at`

### `public.admin_audit_log` / `public.account_bans`
- Логи действий админов; забаненные email (триггер на регистрацию).

## RLS (кратко)

| Файл | Описание |
|------|----------|
| `docs/chat_select_policies.sql` | SELECT на чаты/сообщения — только участникам |
| `supabase/sql/2026-05-21-chats-insert-rls.sql` | INSERT в чаты |
| `supabase/sql/2026-09-04-delete-own-messages.sql` | DELETE своих сообщений |
| `docs/contacts.sql` / `docs/profile_blocks.sql` | Избранное / блокировки |
| `supabase/sql/2026-08-17-subscription-tiers.sql` | Лимиты по тарифам |

## Ключевые миграции

Основные вехи (все 40+ файлов в `my-app/supabase/sql/`):
- `2026-05-08-web-push.sql` — web-push уведомления
- `2026-05-20-subscription.sql` — база подписок
- `2026-08-17-subscription-tiers.sql` — тарифы Free/Pro/Pro+
- `2026-09-04-delete-own-messages.sql` — удаление сообщений
- `2026-09-15-admin-moderation-purge.sql` — модерация (hard purge)

## Связанные документы

- [business-logic.md](business-logic.md) — бизнес-логика работы с данными
- `my-app/docs/ai_context.md` §2 — детальное описание доменной модели