# Блокировка пользователя (profile_blocks)

## Цель

Односторонняя блокировка другого профиля из попапа на карте (`ProfilePreviewCard` → «Заблокировать»). Не путать с админской `profiles.is_blocked`.

## Данные

| Таблица | Смысл |
|---------|--------|
| `profile_blocks` | `owner_id` заблокировал `blocked_profile_id` |
| `profiles.is_blocked` | модерация / админ (другой сценарий) |

Схема и RLS: `my-app/docs/archive/profile_blocks.sql`.

## UI

- Кнопка «Заблокировать» / «Разблокировать» в [`ProfilePreviewCard`](../../../my-app/src/components/ProfilePreviewCard.tsx), только для чужого профиля при авторизации.
- Обработчик: `toggleBlock` в [`useMapPageController.ts`](../../../my-app/src/app/map/hooks/useMapPageController.ts).
- После **успешной** блокировки — тост: «Сообщения этого пользователя больше не будут вам приходить.» (`PaymentSuccessToast` на карте). При разблокировке тост не показывается.

## Поведение после блока

| Область | Поведение |
|---------|-----------|
| Пин на карте | **Остаётся** (профиль не выкидывается из `filteredProfilesForMap`) |
| Список «Профили» | Заблокированный **остаётся** в списке |
| ЛС | Сообщения заблокированного не показываются (RLS + клиент + realtime) |
| Push | Не доставляется заблокировавшему (`pushDispatchServer`) |
| Непрочитанные | Счётчик по peer обнуляется |
| Контакты | Не удаляются автоматически |
| Заблокированный | Не уведомляется; может по-прежнему видеть блокирующего на карте |

Блок односторонний: чтобы скрыть себя от собеседника, он должен заблокировать в ответ.

## Код

- [`contactService.ts`](../../../my-app/src/services/contactService.ts) — `insertBlock`, `deleteBlock`, `fetchBlockedProfileIds`
- [`useContacts.ts`](../../../my-app/src/hooks/useContacts.ts) — загрузка `blockedProfileIds`
- [`useChat.ts`](../../../my-app/src/hooks/useChat.ts) — фильтр realtime
- [`chatService.ts`](../../../my-app/src/services/chatService.ts) — превью чатов, unread

## Критерии готовности

- [x] Пин заблокированного остаётся на карте у блокирующего
- [x] Тост после успешной блокировки
- [x] ЛС и push от заблокированного не приходят блокирующему
