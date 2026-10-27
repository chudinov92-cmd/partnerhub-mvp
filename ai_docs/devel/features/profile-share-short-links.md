# Шортлинки профиля

## Формат

| Тип | Пример |
|-----|--------|
| Короткая (новая) | `https://zeip.ru/p/Ab3xK9mn` |
| Длинная (legacy) | `https://zeip.ru/map?profile=<uuid>` |

Обе ведут на попап профиля на карте. Гость с шортлинка: `/p/code` → 302 → `/map?profile=uuid` → middleware → `/auth?redirect=...`.

## БД

Миграция: [`my-app/supabase/sql/2026-08-19-profile-share-codes.sql`](../../../my-app/supabase/sql/2026-08-19-profile-share-codes.sql)

- Таблица `profile_share_codes` — один код на профиль (8 символов, алфавит без `0OIl1`)
- RPC `get_or_create_profile_share_code(profile_id)` — `authenticated`, ленивое создание при копировании
- RPC `resolve_profile_share_code(code)` — `anon` + `authenticated`

## Код

| Компонент | Путь |
|-----------|------|
| Копирование / share | [`map/page.tsx`](../../../my-app/src/app/map/page.tsx) → `POST /api/profile/share-link` |
| Редирект | [`app/p/[code]/route.ts`](../../../my-app/src/app/p/[code]/route.ts) |
| Ссылки в ЛС | [`MessageLinks.tsx`](../../../my-app/src/components/MessageLinks.tsx) |
| Парсер zeip URL | [`profileShare.ts`](../../../my-app/src/lib/profileShare.ts) |

На карте клик по zeip-ссылке в чате открывает попап без перезагрузки (`resolve_profile_share_code` для `/p/...`).

Кнопка Share в попапе профиля (`ProfilePreviewCard`) доступна **и для своего, и для чужого** профиля: системный share sheet или копирование шортлинка в буфер (тост «Ссылка скопирована»). Для гостя кнопка не показывается.

## SQL на prod

**Supabase SQL Editor** — весь файл миграции.

**VPS** (после `git pull`):

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
docker exec -i supabase-db psql -U supabase_admin -d postgres \
  < supabase/sql/2026-08-19-profile-share-codes.sql
```

Или через [`deploy-app.sh`](../../../my-app/deploy/timeweb/deploy-app.sh).

## Проверка

1. На карте (свой и чужой попап): Share → в буфере `https://zeip.ru/p/XXXXXXXX`
2. Открыть шортлинк в инкогнито → auth → попап профиля
3. Вставить ссылку в ЛС → кликабельная, на карте открывает попап
