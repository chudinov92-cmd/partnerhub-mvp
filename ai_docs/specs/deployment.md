# Инфраструктура и деплой

## Инфраструктура

### VPS Timeweb
- **Один сервер**: хост `186.246.2.104`
- **Домен**: `zeip.ru` → Docker `app-web` (Next.js)
- **Subdomain**: `supabase.zeip.ru` → self-hosted Supabase stack (Kong/PostgREST/Auth/Realtime/Studio)
- **Веб-сервер**: Caddy (TLS-терминатор, reverse-proxy, HSTS, security headers)

### Self-hosted Supabase
- Полный стек Supabase в Docker-контейнерах (`supabase-db`, `supabase-kong`, `supabase-auth`, `supabase-rest`, `supabase-realtime`, `supabase-studio`).
- Postgres — основной контейнер `supabase-db`.
- Настройки: `/root/zeip/supabase-stack/.env` (содержит SMTP, ANON_KEY, SERVICE_ROLE_KEY, JWT secret).
- Глобальные JWT-секреты привязаны к домену `zeip.ru`.

### Сеть
- Docker bridge: `172.17.0.0/16`
- `app-web` слушает порт **3001** на bridge (для pg_net push dispatch).
- Caddy проксирует:
  - `zeip.ru` → `app-web:3000`
  - `supabase.zeip.ru` → Kong (`supabase-kong:8000`)

## Переменные окружения

### Локальная разработка (`.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `CSP_REPORT_ONLY=1`, `CSP_DISABLE_HSTS=1` (отладка CSP)

### Сервер (`.env.app`)
- `NEXT_PUBLIC_*` — публичные (собираются в бандл)
- `SUPABASE_SERVICE_ROLE_KEY`, `ROBOKASSA_PASSWORD1/2`, `SMTP_*`, `VAPID_*`, `INTERNAL_PUSH_SECRET`, `INTERNAL_EMAIL_SECRET` — секреты (только сервер)

Источник истины для SMTP: `/root/zeip/supabase-stack/.env`, синхронизация через `scripts/vps/sync-smtp-to-env-app.sh`.

## Деплой

### Схема деплоя
1. Локально: `npx nx build my-app` (проверка сборки).
2. Коммит + push в `main`.
3. На VPS (автоматически или руками):
   ```bash
   ssh root@186.246.2.104
   cd /root/zeip/my-app
   git pull --ff-only
   bash deploy/timeweb/deploy-app.sh
   ```

### Скрипты

| Скрипт | Назначение |
|--------|------------|
| `scripts/vps/run-deploy-remote.sh` | Полный деплой с Mac (rsync + docker compose) |
| `deploy/timeweb/deploy-app.sh` | Деплой на VPS: SQL-миграции, сборка, перезапуск |
| `deploy/timeweb/docker-compose.app.yml` | Compose-файл приложения |
| `scripts/vps/sync-smtp-to-env-app.sh` | Синхронизация SMTP из stack `.env` в app `.env` |
| `scripts/migration/install_backup_cron.sh` | Установка ежедневного бэкапа |
| `scripts/migration/backup_self_hosted_supabase.sh` | Бекап Supabase (`KEEP_BACKUPS=14`) |

### Docker
- Образ: Next.js standalone (`output: 'standalone'`)
- Docker Compose: `deploy/timeweb/docker-compose.app.yml`
- После деплоя: `docker compose -f docker-compose.app.yml up -d --build`

### Caddy
Конфиг: `deploy/timeweb/Caddyfile.example` (HSTS, security headers на всех хостах). CSP — только в Next (не дублируется в Caddy).

## SQL-миграции

Папка: `my-app/supabase/sql/` (40+ файлов, именование `YYYY-MM-DD-описание.sql`).

Способы применения:
- SQL Editor в Supabase Studio (`https://supabase.zeip.ru`)
- На сервере: `docker exec -i supabase-db psql -U supabase_admin -d postgres < sql/YYYY-MM-DD-*.sql`
- Через `deploy-app.sh`

## Cron / бэкапы

- Ежедневный бэкап Postgres: `backup_self_hosted_supabase.sh`
- Хранение: 14 последних дампов.
- Скрипты диагностики диска: `scripts/vps/zeip-disk-cleanup-*.sh`

## Healthcheck

```bash
# Приложение
curl -I https://zeip.ru/

# Supabase API
curl -sS -o /dev/null -w "%{http_code}" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  https://supabase.zeip.ru/rest/v1/
```

## Связанные документы

- `my-app/docs/timeweb-migration-runbook.md` — полный ранбук миграции
- `my-app/docs/performance-rollout.md` — чеклист производительности
- `my-app/deploy/timeweb/README-disk-maintenance.md` — обслуживание диска