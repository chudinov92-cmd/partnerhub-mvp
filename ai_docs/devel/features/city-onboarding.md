# Онбординг «Выберите город»

**Статус:** реализовано — плашка под селектором города в TopBar на `/map` **только для гостей**.

## Цель

Подсказать гостю выбрать город для просмотра карты и общего чата.

## Город на карте vs город в профиле

| Хранилище | Назначение | Где меняется |
|-----------|------------|--------------|
| `localStorage.selected_city` | Временный просмотр на карте / в чате | Селектор в TopBar на `/map` |
| `profiles.city` | Основной город пользователя | Страница [`/profile`](/profile) |

**Селектор на `/map` не пишет в `profiles.city`.**

- В той же сессии (F5, навигация) сохраняется временный выбор из localStorage.
- Город из профиля (`profiles.city`) применяется как город на карте **автоматически при каждом доступе к `/map`**, пока пользователь сам не выбрал город вручную (в селекторе шапки или «Открыть всю Россию»). Руками выбранный город не перетирается профилем.
- После **выхода и нового входа** (`SIGNED_IN`) карта сбрасывается на `profiles.city` (если задан в профиле).
- Логика решения: `my-app/src/lib/profileCitySelection.ts` (`shouldApplyProfileCity`), применение — `useMapPageController` (эффект синхронизации).

## Когда показывается плашка

Плашка «Выберите город» видна на `/map`, если:

- пользователь **не авторизован**;
- `localStorage.city_onboarding_acknowledged !== '1'`;
- **и** `selected_city === 'Россия'`.

Не показывается, если:

- пользователь авторизован (см. [profile-onboarding.md](./profile-onboarding.md));
- пользователь уже acknowledged (выбрал город или повторно нажал «Россия» в dropdown);
- у гостя в localStorage уже выбран конкретный город (не «Россия»).

## Завершение онбординга

1. Выбор **конкретного города** из списка → только `selected_city` в localStorage.
2. Повторный клик **«Россия»** в dropdown → только dismiss.

## Код

| Файл | Назначение |
|------|------------|
| `my-app/src/lib/cityOnboarding.ts` | логика show/ack, `isSpecificCity` |
| `my-app/src/components/CityOnboardingBanner.tsx` | UI плашки |
| `my-app/src/components/TopBarCitySelect.tsx` | callback `onCityChosen`; на мобилке — bottom sheet ([`mobile-select-sheet.md`](../components/mobile-select-sheet.md)), логика acknowledge без изменений |
| `my-app/src/components/TopBar.tsx` | оркестрация на `/map`, сброс города при `SIGNED_IN` |

## Связанные документы

- [profile-onboarding.md](./profile-onboarding.md) — онбординг для authed.
- [ip-city-detection.md](./ip-city-detection.md) — дефолт «Россия», без IP-геолокации.
