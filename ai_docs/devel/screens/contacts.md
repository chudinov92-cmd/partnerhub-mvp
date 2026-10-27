# Экран: вкладка «Контакты» на карте

## Назначение

Показать **избранные контакты** пользователя (`profile_contacts`) — независимо от того, была ли переписка. Это не список личных чатов.

Доступ: нижняя навигация «Контакты», иконка людей в TopBar (при `contactCount > 0`), query `?contacts=1` на `/map`.

## Элементы

| Элемент | Поведение |
|---------|-----------|
| Заголовок «Контакты» + иконка людей | Режим `contactsOnlyMode` |
| Кнопка «Сбросить» | Убирает `?contacts=1`, переключает на «Мои чаты» |
| Список карточек | Имя, профессия, превью последнего сообщения или «Нет сообщений» |
| Empty state | «У вас пока нет контактов. Добавьте человека из профиля на карте.» |
| Бейдж в TopBar | `countContactsForOwner` — число строк в `profile_contacts` |

## Сценарии

1. **Добавление контакта** — кнопка «Добавить в контакты» в попапе чужого профиля на карте. Контакт сразу появляется в списке и в бейдже.
2. **Клик по контакту без чата** — открывается попап профиля (написать / удалить из контактов).
3. **Клик по контакту с чатом** — открывается личная переписка.
4. **Клик по имени** — всегда попап профиля (stopPropagation).
5. **Удаление** — «Удалить из контактов» в попапе профиля.

## Лимиты тарифов

| Тариф | Избранное |
|-------|-----------|
| Free | до 5 контактов; 6-й → PaywallDrawer `intent=favorites_limit` |
| Pro / Pro+ | без лимита |

Enforcement: UI [`useContacts.ts`](../../../my-app/src/hooks/useContacts.ts), сервис [`contactService.ts`](../../../my-app/src/services/contactService.ts), RLS [`2026-08-17-subscription-tiers.sql`](../../../my-app/supabase/sql/2026-08-17-subscription-tiers.sql).

## Код

| Файл | Роль |
|------|------|
| [`useContacts.ts`](../../../my-app/src/hooks/useContacts.ts) | Загрузка id + профилей контактов |
| [`contactService.ts`](../../../my-app/src/services/contactService.ts) | `fetchContactProfiles`, insert/delete |
| [`useMapPageController.ts`](../../../my-app/src/app/map/hooks/useMapPageController.ts) | `filteredChatList` в режиме контактов |
| [`ChatsColumn.tsx`](../../../my-app/src/app/map/components/ChatsColumn.tsx) | UI списка и empty state |
| [`useChatHandlers.ts`](../../../my-app/src/app/map/hooks/useChatHandlers.ts) | `openChatFromList`: чат или попап |

## Отличие от «Мои чаты»

«Мои чаты» — только диалоги с сообщениями (`chat_members`). «Контакты» — все избранные профили, чат опционален.

## Edge cases

- **Контакт без переписки** — карточка в списке; клик открывает попап профиля.
- **Профиль удалён / недоступен** — строка в `profile_contacts` осталась, но `profiles` нет: показываем «Профиль недоступен», можно удалить из контактов.
- **RLS / скрытый с карты профиль** — после деплоя RPC `get_contact_profiles` (миграция `2026-09-17-contact-profiles-rpc.sql`) профиль читается через join; до деплоя — fallback через `profiles.in(id)`.

### SQL (prod)

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
ssh root@<VPS_IP>
docker exec -i supabase-db psql -U supabase_admin -d postgres \
  < /root/zeip/my-app/supabase/sql/2026-09-17-contact-profiles-rpc.sql
```
