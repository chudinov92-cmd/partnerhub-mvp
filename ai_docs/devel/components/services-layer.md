# Сервисный слой (`src/services/`)

## Правила

1. **Страницы и компоненты не вызывают `.from()` / `.rpc()` напрямую** — только функции из `src/services/*`.
2. **Запрещены escape hatch'и** вида `profileTable()`, `adminFrom()` — только именованные функции с понятным контрактом.
3. **Barrel-импорты** для потребителей: `@/services/chatService`, `@/services/profileService`, `@/services/adminService` — внутренняя структура модулей может меняться без правок UI.
4. Серверные route handlers и `lib/*Server.ts` могут использовать `createSupabaseAdmin()` — это отдельный слой, не client-services.

## Контракт ошибок

1. Функции с PostgREST в `src/services/*` возвращают `{ data, error }` (или `{ ok, error }` для мутаций без тела) — **не бросают** ожидаемые ошибки RLS/валидации.
2. `throw` — только для контрактных сбоев (нет сессии, неверный аргумент, неожиданный null) и в route handlers после логирования.
3. UI и хуки показывают текст через `getErrorMessage` из [`lib/errors.ts`](../../../my-app/src/lib/errors.ts) (реэкспорт в `lib/support.ts` для чата).
4. Новые функции сервисного слоя — только по этому контракту; массовый rewrite старых функций — отдельными PR.

## Структура

> Движок профилей, справочников и карты вынесен в Nx-библиотеки. В `src/services/`
> остаются только тонкие barrel-реэкспорты для обратной совместимости импортов
> `@/services/*`.

| Barrel | Модули | Назначение | Источник |
|---|---|---|---|
| `profileService.ts` | `profile/match`, `map`, `session`, `likes`, `editor` | Карта, сессия, лайки, онбординг/редактор профиля | `@my-startup/profile` |
| `contactService.ts` | контакты, блокировки, просмотры | Контакты, блокировки, просмотры, `countContactsForOwner` | `@my-startup/profile` |
| `chatService.ts` | `chat/support`, `sidebar`, `ensure`, `messages`, `quota` | ЛС, realtime, квота собеседников/день | `@my-startup/chat` |
| `adminService.ts` | (один файл, именованные функции) | Списки и мутации админки через RLS | приложение |

Библиотека `@my-startup/profile` (в `libs/profile/src/lib/`) содержит:
- `services/` — `match`, `map`, `viewport`, `session`, `likes`, `editor`, `contacts`
- `hooks/` — `useProfiles`, `useContacts`
- `catalogs/` — справочники профессий/отраслей + `catalogCache`, `profanity`, сиды
- `components/` — `ProfilePreviewCard`

Библиотека `@my-startup/map-ui` (в `libs/map-ui/src/lib/`) содержит:
- `components/` — `PartnerMap`, `ProfileLocationPicker`
- `map/` — `geoPrivacy`, `pinElement`
- `data/` — `cityMapViews` (`LngLat`, `getMapConfigForCity`)

## Онбординг / профиль

Страницы [`onboarding/page.tsx`](../../../my-app/src/app/onboarding/page.tsx) и [`profile/page.tsx`](../../../my-app/src/app/profile/page.tsx) используют:

- `fetchOrCreateOnboardingProfile` / `fetchOrCreateEditorProfile`
- `fetchProfileLastName`, `fetchProfileWorkBlocks`, `fetchLocationForProfile`
- `updateProfileById`, `upsertActiveLocation`, `fetchMapVisible`
- справочники профессий/отраслей — хук [`useProfiles`](../../../libs/profile/src/lib/hooks/useProfiles.ts) (кэш в [`catalogCache.ts`](../../../libs/profile/src/lib/catalogs/catalogCache.ts))

Маскирование и валидация остаются в UI.

## Админка

Чтение списков — `adminFetch*List`, `adminFetchCatalogs`, `adminFetchDashboardCounts`.  
Аудит — `adminInsertAuditLog`.  
Критичные мутации users/posts — по-прежнему через `/api/admin/*`.
