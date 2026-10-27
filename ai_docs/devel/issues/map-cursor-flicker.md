# Мигание курсора на карте (Chrome / Cursor)

## Симптом

При движении мыши по карте `/map` курсор постоянно переключается со стрелки на руку. Воспроизводится в Chrome и во встроенном Chromium Cursor; Safari обычно не затронут.

## Причина

Два независимых бага Chromium, которые складываются:

1. **Полноэкранный оверлей** `pointer-events-none absolute inset-0 z-[1100]` над картой (`MapColumn`). В Chromium слой с `pointer-events: none` над `<canvas>` участвует в расчёте курсора: `auto` (стрелка) ↔ `grab`/`pointer` (рука).
2. **Canvas не наследует `cursor: grab`** с `.mmrgl-canvas-container`. mmr-gl задаёт grab только контейнеру; сам `<canvas>` — compositor-слой без cursor, Chrome рисует default (стрелку) и дёргает его с grab родителя.

Клики по пинам идут через HTML-маркеры (`cursor: pointer` только на `.partner-map-pin-wrap`).

## Фикс

- Убран inset-оверлей: кнопки фильтров позиционируются напрямую в `mapContainerRef`.
- В `globals.css` `cursor: grab` / `grabbing` задан на `.mmrgl-canvas`.
- Хит-тест маркера сужен до визуала пина (`pointer-events: none` на корне, `auto` на wrap).

Код: [`MapColumn.tsx`](../../../my-app/src/app/map/components/MapColumn.tsx), [`globals.css`](../../../my-app/src/app/globals.css).
