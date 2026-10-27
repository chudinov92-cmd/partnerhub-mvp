# Город по умолчанию на карте

**Статус:** IP-геолокация (MaxMind) **отменена** — не используем обработку IP (152‑ФЗ).

## Текущее поведение

| Ситуация | Город на карте и в общем чате |
|---|---|
| Первый визит (нет `selected_city` в localStorage) | **Россия** (вид всей страны, zoom 3) |
| Повторный визит | Сохранённый выбор из localStorage |
| Ручная смена в шапке | Запоминается в `selected_city` |

Код: [`SelectedCityContext.tsx`](../../../my-app/src/contexts/SelectedCityContext.tsx), [`cityMapViews.ts`](../../../my-app/src/data/cityMapViews.ts).

## Что убрано

- `/api/geo/detect-city`, `maxmind`, GeoLite2 на VPS, `InitialCityResolver`.

## Что осталось

- Координаты всех городов из `CITY_OPTIONS` в `cityMapViews.ts` (для выбора города вручную).
- Скрипт регенерации: `node scripts/generate-city-map-views.mjs` (папка `my-app/`).

## Идеи на будущее (без IP)

- ~~Модалка «Выберите город» при первом заходе.~~ → **реализовано:** плашка в TopBar, см. [city-onboarding.md](./city-onboarding.md).
- Кнопка «Определить город» через `navigator.geolocation` с явным согласием пользователя.
