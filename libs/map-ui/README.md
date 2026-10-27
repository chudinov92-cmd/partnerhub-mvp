# @my-startup/map-ui

Визуальная часть карты: компоненты `PartnerMap`, `ProfileLocationPicker`, гео-приватность
(`map/geoPrivacy`), DOM-хелперы пинов (`map/pinElement`) и данные городов (`data/cityMapViews`).

Зависит от `@my-startup/profile` (типы/сервисы) и `@my-startup/subscription` (цвета пинов).
Карта — VK Maps (`mmr-gl`); ключ берётся из `NEXT_PUBLIC_VK_MAPS_API_KEY`.

## Building

Run `nx build map-ui` to build the library.
