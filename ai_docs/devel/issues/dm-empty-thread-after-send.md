# ЛС: пустой тред при живом превью в списке

## Симптом

В колонке «Мои чаты» превью обновляется («Можешь помочь советом?»), но окно диалога показывает empty state: «Пока нет сообщений». После хард-релоада — то же.

## Причины (два независимых слоя)

### 1. Гонка после send (исправлено 2026-09-16)

- **Список** — `chatList[].lastMessagePreview` обновляется оптимистично в `handleSendChatMessage`.
- **Тред** — `chatMessages` перезаписывался в `openChatWithProfile` результатом `fetchRecentMessages`.

Параллельные вызовы `openChatWithProfile` (deeplink `?chat=`, refetch `profiles`) завершались позже send и затирали тред пустым массивом. Дополнительно `openChatFromList` игнорировал `item.chatId` и мог открыть другой дубль 1:1 чата.

### 2. Paywall до загрузки треда (исправлено 2026-09-17)

В режиме `paid_gate` Free-пользователь открывал **существующий** ЛС из списка или после письма. `openChatWithProfile` ставил `activeChatUser` и делал early-return на paywall **до** `fetchRecentMessages`. Окно рисовалось пустым, композер — активным.

**Правило:** существующие ЛС **читаются** на Free (как общий чат). Paywall — только на **новый** диалог («Написать» с пина) и на **отправку** ответа.

## Исправление

| Область | Изменение |
|---|---|
| `useChatHandlers.ts` | `hasExistingChat` → грузить тред без paywall; paywall только если чата ещё нет; `canSendDmToPeer` для send |
| `ChatDialog.tsx` | Read-only плашка + CTA Pro для Free без права писать |
| `useMapEffects.ts` | `?chat=` через `fetchProfileForMapById` + `knownChatId` из `chatList` |
| `messages.ts` | `mergeChatMessages`, лимит fetch 50, fallback на `chatId` из сайдбара |
| `2026-09-17-email-dm-deeplink.sql` | RPC `get_profiles_for_message_email` → `peer_profile_id`; CTA `/map?chat=` |
| `new-message/route.ts` | `emailMapChatLink(peerProfileId)` |
| SQL 2026-09-16 | RPC `ensure_private_chat`, dedupe дублей 1:1 |

## Проверка

1. Free + `paid_gate`: открыть существующий ЛС из «Мои чаты» — пузыри видны, композер — плашка «Оформить Pro» → `/subscription?reason=dm`.
2. Хард-релоад того же окна — сообщения на месте.
3. Письмо → `/map?chat=<peerId>` — тот же тред, даже если собеседника нет на карте.
4. «Написать» с пина без истории — paywall, пустое окно не открывается.
5. Открыть ЛС и отправить до «Загружаем…» — пузырь остаётся в треде.
6. Клик по карточке в списке открывает ту же переписку, что в превью.

## SQL (Supabase SQL Editor)

Папка проекта: `my-app/`. Запустить **по порядку** (если ещё не применяли):

1. `my-app/supabase/sql/2026-09-16-ensure-private-chat-latest.sql`
2. `my-app/supabase/sql/2026-09-16-dedupe-private-chats.sql`
3. `my-app/supabase/sql/2026-09-17-email-dm-deeplink.sql` — deeplink в письме о непрочитанном
