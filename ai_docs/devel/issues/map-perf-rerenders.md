# Производительность `/map`: ререндеры и DOM-пины

## Проблема

Каждый keystroke в чате/LС пересобирал `PartnerMap`: inline-колбэки в `MapColumn`, god-hook с `keyboardInset`/`vvTop`, полный `remove()` всех HTML-маркеров.

## Решение (фаза 1)

| Область | Изменение |
|---|---|
| Колбэки | `handleMapPinOpenProfile` / `handleMapPinOpenChat` — `useCallback` в `useMapPageController` |
| Memo | `React.memo` на `PartnerMap`, `FeedColumn`, `MapColumn`, `ChatsColumn`, `ChatDialog` |
| Маркеры | Diff по `location.id`: создать / обновить DOM / удалить исчезнувшие |
| rAF | `usePreventBodyScroll`: цикл `scrollTo` только пока `scrollY !== 0` (iOS Safari fix сохранён) |
| Inset | `useVisualViewportLayout` локально в `FeedColumn` и `ChatDialog`, не в god-hook |

## Файлы

- `my-app/src/app/map/hooks/useMapPageController.ts`
- `my-app/src/app/map/components/MapColumn.tsx`
- `my-app/src/components/PartnerMap.tsx`
- `my-app/src/app/map/utils.ts`
- `my-app/src/hooks/useMobileKeyboardInset.ts` (используется локально)

## Проверка

1. DevTools: набор текста в ЛС **не** пересоздаёт все маркеры.
2. iPhone Safari: дропдаун фильтров, лента, карта — без серой полосы viewport.
