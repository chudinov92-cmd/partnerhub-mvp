# Публичные доп. профессии и ранжирование поиска на карте

## Цель

Показывать в попапе профиля на карте все блоки «Профессия / Отрасль / Подотрасль» из настроек (`profiles` + `profile_work`) и учитывать доп. профессии при фильтрации и сортировке списка/пинов.

## Источники данных

| Слот | Таблица | Поля |
|------|---------|------|
| Основной (шапка попапа) | `profiles` | `role_title`, `industry`, `subindustry`, `experience_years`, `current_status` |
| Доп. 1–4 | `profile_work` | `role_title`, `industry`, `subindustry`, `experience_years`, `sort_order` |

Порядок доп. блоков: `sort_order` (0..n-1), задаётся при сохранении в `/profile`.

## UI

- **Футер своего попапа**: кнопка **«Мой профиль»** → `/profile` (редактирование). Чужой попап: контакты + «Написать»; отдельной ссылки на `/profiles/[id]` нет.
- **Шапка попапа** (`ProfilePreviewCard`): только `profiles.role_title` (клик → фильтр по профессии).
- **Тело попапа**: секция «Дополнительные профессии» — блоки из `work_blocks` с кликабельной профессией.
- **Список «Профили»**: при активном фильтре по профессии — сортировка по слоту совпадения, затем Pro, затем рейтинг; для совпадения не в primary — зелёный бейдж искомой профессии.
- **Список «Профили» и выборка карты** показывают только пользователей с **активным пином** (`locations.is_active = true`). Профили с `map_visible = true`, но без точки (тестовые/системные), в список и в `fetchProfilesForMap` не попадают. Deeplink `?profile=` (`fetchProfileForMapById`) — без этого ограничения.

## Поиск по профессии

- Матч: `getProfessionMatchIndex(profile, profession)` — 0 = primary, 1+ = доп. блоки по `sort_order`.
- Фильтр карты: `profileMatchesProfession` (не только `role_title ===`).
- Фильтры отрасли/подотрасли **не** расширяются на `profile_work` (только профессия).
- **Свой пин** на карте остаётся при любом наборе фильтров «Поиск специалистов» (профессия, отрасль, «Ищут», возраст, рекомендованные, только контакты), даже если профиль пользователя не проходит фильтр. Список «Профили» — строго по фильтру, без себя. Реализация: `profilesForMapPins` в [`useMapPageController.ts`](../../../my-app/src/app/map/hooks/useMapPageController.ts) = `filteredProfilesForMap` + свой профиль из `profiles`, если его там нет.

## БД и RLS

Скрипт: `my-app/docs/profile_work_public_read.sql`

- колонка `sort_order`;
- `GRANT SELECT` для `anon`, `authenticated`;
- политика `profile_work_select_public` (`USING (true)`);
- insert/update/delete — только владелец профиля.

## Код

- `src/services/profileService.ts` — embed `profile_work`, хелперы match index, `fetchActiveLocationUserIds`, фильтр `fetchProfilesForMap` / `fetchProfilesInterestedIn` по активным `locations`
- `src/components/ProfilePreviewCard.tsx` — секция доп. профессий
- `src/app/map/page.tsx` — фильтр и сортировка списка
- `src/components/PartnerMap.tsx` — `professionFilter`, z-order пинов, `scrollZoom: true` (зум колесом мыши и pinch на трекпаде на десктопе; double-tap на touch — через `doubleClickZoom` / `touchZoomRotate` по умолчанию mmr-gl); при **первом открытии** карты камера один раз центрируется по **своему пину** (координаты — `fetchOwnActiveLocation`, не из bbox viewport); `jumpTo` центра города — только при смене `selectedCity` (`center`/`zoom` из `mapConfig`) или если своей точки нет после `currentUserReady`; закрытие попапа и смена фильтров вьюпорт не сбрасывают; deeplink на чужой профиль — `flyTo` focused-пина

## Критерии готовности

- [x] SQL для публичного чтения `profile_work`
- [x] Попап показывает доп. блоки
- [x] Поиск находит профили с профессией в любом слоте
- [x] Сортировка: primary match выше secondary

## Запуск SQL

Папка: `my-app/docs/`

Выполнить `profile_work_public_read.sql` целиком в SQL Editor Supabase (self-host / Timeweb) до или сразу после деплоя фронта.
