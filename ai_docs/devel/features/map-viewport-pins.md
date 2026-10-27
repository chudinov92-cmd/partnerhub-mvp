# Карта: пины (viewport + свой пин)

## Текущее поведение

| Источник | Что грузит |
|---|---|
| `useMapViewport` | `loadMapViewportData` — пины/кластеры в bbox камеры |
| `fetchOwnActiveLocation` | активная точка текущего пользователя **без bbox** |
| `PartnerMap` | HTML-пины на street, light/grid на среднем/дальнем зуме; свой пин отдельно |

При первом открытии камера ждёт `currentUserReady` + `ownLocationResolved` и делает `jumpTo` на свой пин. Центр города — fallback, если точки нет.

RPC `fetch_map_viewport_pins`: `p_own` / `p_focused` попадают в выдачу даже вне bbox и фильтров (`2026-09-17-fetch-map-viewport-pins-own-outside-bbox.sql`).

## Отрисовка

- Street (`zoom >= 13`): HTML-пины (`mmrgl.Marker`)
- Cluster (`9–12`): light-точки + отдельный HTML свой пин
- Grid (`<= 8`): кластеры + отдельный HTML свой пин
- Obfuscate **250 м** по `user_id`

## Оптимизации из perf-плана (сохранены)

- `React.memo` + стабильные колбэки (`handleMapPinOpenProfile` / `handleMapPinOpenChat`)
- Diff маркеров в `PartnerMap` (не remove all)
- Умный rAF в `usePreventBodyScroll`
- `keyboardInset` / viewport — локально в `FeedColumn` и `ChatDialog`
