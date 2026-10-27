# Mobile select sheet

## Назначение

Единый overlay для всех пользовательских списков выбора: на ширине **&lt; 1024px** — full-screen picker, привязанный к `visualViewport` **сверху** (тот же паттерн, что [`ChatDialog.tsx`](../../../my-app/src/app/map/components/ChatDialog.tsx)); на **lg+** — dropdown через portal (не клиппится `overflow-hidden` панелей карты).

## Компоненты

| Файл | Роль |
|---|---|
| [`SelectOverlay.tsx`](../../../my-app/src/components/select/SelectOverlay.tsx) | Роутинг sheet vs desktop menu |
| [`MobileSelectSheet.tsx`](../../../my-app/src/components/select/MobileSelectSheet.tsx) | Full-screen picker (`top: vv.offsetTop`, `height: vv.height`), portal в `document.body` |
| [`DesktopSelectMenu.tsx`](../../../my-app/src/components/select/DesktopSelectMenu.tsx) | Fixed dropdown по `getBoundingClientRect` |
| [`useIsLgUp.ts`](../../../my-app/src/hooks/useIsLgUp.ts) | Брейкпоинт `min-width: 1024px` |
| [`useOverlayBodyLock.ts`](../../../my-app/src/hooks/useOverlayBodyLock.ts) | Lock scroll, не затирает `usePreventBodyScroll` на `/map` |

## Подключения

- [`DropdownSelect.tsx`](../../../my-app/src/components/DropdownSelect.tsx) — отрасль, подотрасль, статус, фильтры карты, interested_in
- [`ProfessionDropdown.tsx`](../../../my-app/src/components/ProfessionDropdown.tsx) — профессия с «Другое» и подсказкой
- [`CityDropdown.tsx`](../../../my-app/src/components/CityDropdown.tsx) — город (+ опционально «Россия»)
- [`TopBarCitySelect.tsx`](../../../my-app/src/components/TopBarCitySelect.tsx) — город в TopBar

## Поведение mobile sheet

- Панель `position: fixed`, `top = visualViewport.offsetTop`, `height = visualViewport.height`, `bottom: auto` — при открытии клавиатуры сжимается вместе с vv, поиск и список остаются над клавиатурой
- Поиск sticky, **без autoFocus**; на таче — fake input до явного тапа
- Поиск показывается если `searchable` или `options.length > 8`
- Пункты `min-h-11 text-sm`; `variant="profile"` — акцент `#009966`
- `z-index: 2050` (между TopBar 1500 и paywall 2100+)
- Закрытие: крестик, backdrop, Escape, выбор пункта

## API DropdownSelect

- `title?: string` — заголовок sheet (fallback: `placeholder`)
- Остальные пропсы без изменений

## Вне скоупа

Нативные `<select>` в `/admin/*`, чипы и чекбоксы («Ищу», статус в квизе).
