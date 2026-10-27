# Деплой и очистка диска VPS Zeip (Timeweb) — 2026-09-16

**Сервер:** `root@186.246.2.104`  
**Статус:** деплой и очистка **успешны** (ручной прогон из терминала пользователя).

## Деплой

| Параметр | Значение |
|----------|----------|
| Commit | `1085d9f` — refactor(services): chat/profile модули, админка, LandingFooter |
| Предыдущий prod | `98930b9` |
| Образ | `timeweb-app-web:latest` (build ~72 s) |
| Контейнер | `app-web` Up, Next.js 16.1.6 Ready in 104 ms |
| cookie-consent API | HTTP 200 |
| `/subscription` | HTTP 200 |
| SQL | все миграции идемпотентно; `profession-catalog-label-key` — OK |
| SMTP sync | из `supabase-stack/.env` → `.env.app` |

One-off SQL **не запускались:** `delete-test-users-onboarding`, `purge-orphan-vovchik`.

## BEFORE / AFTER (очистка диска)

| Момент | Занятость `/` |
|--------|----------------|
| **BEFORE** (10:17:28 UTC, после docker build) | **43 GB / 77 GB (56%)** — свободно 35 GB |
| **AFTER** (10:18:01 UTC) | **21 GB / 77 GB (27%)** — свободно 57 GB |

**Освобождено ~22 GB** за ~33 секунды.

| Источник | Освобождено |
|----------|-------------|
| Docker **Build Cache** | **~23.2 GB** (главный виновник) |
| journald (архивы) | **721 MB** |
| Неиспользуемые образы (`curlimages/curl`) | ~10 MB |
| Бэкапы `.dump` | не трогали (14 шт., ~11 MiB — в пределах лимита KEEP=14) |
| Postgres volume | не тронут |

Лог на сервере: `/root/zeip/backups/daily/disk-cleanup-2026-09-16_10-17-28.log`

## Prod после очистки

| Проверка | Результат |
|----------|-----------|
| `https://zeip.ru/` | ожидается HTTP 200 (app-web Up) |
| Контейнеры | **15/15** Up, supabase healthy |
| Build cache | **0 B** |
| Rollback keeper | `timeweb-app-web:latest` удержан через keeper-контейнер |

## Замечания

- На VPS висит `*** System restart required ***` (kernel updates) — запланировать reboot в окно простоя.
- `/root/zeip/app` (~33 MiB) не удалён — ниже порога 50 MiB в скрипте; cron на него не ссылается.
- Образ `freemium-rollback` не упоминался — при необходимости откат через git checkout + rebuild.

## Команды (для повтора)

**Деплой:**

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
git pull --ff-only
bash deploy/timeweb/deploy-app.sh
```

**Очистка (после успешного up):**

```bash
cd /root/zeip/my-app
bash scripts/vps/zeip-disk-cleanup-console.sh
```

## Supabase SQL

Schema-миграции накатаны через `deploy-app.sh`. Отдельный SQL Editor не требовался.
