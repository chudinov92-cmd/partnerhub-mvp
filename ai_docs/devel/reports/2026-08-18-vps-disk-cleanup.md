# Очистка диска VPS Zeip (Timeweb) — 2026-08-18

**Сервер:** `root@186.246.2.104`  
**Статус:** очистка **успешна** (запуск с Mac: `bash scripts/vps/run-zeip-disk-cleanup-remote.sh`).

## BEFORE / AFTER

| Момент | Занятость `/` |
|--------|----------------|
| **BEFORE** (18:23:24 UTC) | **53 GB / 77 GB (69%)** — свободно 24 GB |
| **AFTER** (18:24:16 UTC) | **20 GB / 77 GB (26%)** — свободно 57 GB |

**Освобождено ~33 GB** за ~52 секунды.

| Источник | Освобождено |
|----------|-------------|
| Docker **Build Cache** | **32.96 GB** (главный виновник) |
| journald (архивы) | **2.1 GB** |
| Неиспользуемые образы (`freemium-rollback`, `app-web-test`) | ~67 MB |
| Бэкапы `.dump` | не трогали (14 шт., ~10 MiB — в пределах лимита) |

Лог на сервере: `/root/zeip/backups/daily/disk-cleanup-2026-08-18_18-23-24.log`

## Prod после очистки

| Проверка | Результат |
|----------|-----------|
| `https://zeip.ru/` | HTTP **200** |
| Контейнеры | **14/14** Up, supabase healthy |
| Postgres volume | не тронут |
| Build cache | **0 B** |

## Замечание: образ отката удалён

Keeper-контейнер создался, но **`docker system prune` шёл до `image prune`** и удалил stopped keeper — вместе с ним ушли теги `timeweb-app-web:freemium-rollback` и `timeweb-app-web-test:latest`.

Быстрый откат freemium (~10 s) **сейчас недоступен** без пересборки. Полный откат по-прежнему возможен:

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
git checkout prod-freemium-2026-08-10
cp deploy/timeweb/.env.app.freemium.bak deploy/timeweb/.env.app
bash deploy/timeweb/deploy-app.sh
```

В репозитории исправлен порядок prune: **builder → image (с keeper) → system prune** — см. `timeweb_disk_maintenance.sh`, `zeip-disk-cleanup-console.sh`.

## Запуск (для следующего раза)

**Папка на Mac:**

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
bash scripts/vps/run-zeip-disk-cleanup-remote.sh
```

Мониторинг: при **>75%** диска — `diagnose`; при **>85%** — полный цикл или `docker builder prune -a -f`.

Предыдущий прогон (2026-05-30): ~66 GB → ~16 GB — [`2026-05-30-vps-disk-cleanup.md`](./2026-05-30-vps-disk-cleanup.md).

## Supabase SQL

Не требовался.
