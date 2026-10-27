# Шортлинки профиля — чеклист

## SQL

- [x] Накат [`2026-08-19-profile-share-codes.sql`](../../my-app/supabase/sql/2026-08-19-profile-share-codes.sql) на prod
- [x] `deploy-app.sh` включает миграцию `profile-share-codes`

## Код

- [x] `GET /p/[code]` → редирект на `/map?profile=`
- [x] `POST /api/profile/share-link`
- [x] `shareProfileLink` копирует короткий URL
- [x] Share в попапе доступен и для своего профиля
- [x] `MessageLinks` в ЛС и support

## Проверка на prod

- [ ] Share (свой и чужой попап) → `https://zeip.ru/p/XXXXXXXX`
- [ ] Шортлинк открывает профиль (auth для гостя)
- [ ] Ссылка в ЛС кликабельна; на `/map` — попап без reload
- [ ] Legacy `/map?profile=uuid` работает

## Документация

- [x] [`ai_docs/devel/features/profile-share-short-links.md`](../devel/features/profile-share-short-links.md)
