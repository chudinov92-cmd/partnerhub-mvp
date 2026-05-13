# Zeip Migration Runbook (Timeweb, Variant A)

This runbook migrates production from Vercel/Supabase Cloud to one Timeweb server:

- `zeip.ru` -> Next.js `app-web` container
- `supabase.zeip.ru` -> self-hosted Supabase (Kong/PostgREST/Auth)
- Postgres data fully restored from current production source

## 0) Preconditions

- You have SSH access to Timeweb server (`root@186.246.2.104` or equivalent).
- You have Postgres connection URL for **source production DB**.
- You have Postgres connection URL for **target Timeweb DB** (inside self-hosted Supabase).
- You run all local commands from:
  - `/Users/vladimirchudinov/Desktop/my-startup/my-app`

## 1) Safety backups (source + target)

From Mac terminal:

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
bash scripts/migration/backup_postgres.sh "<SOURCE_DB_URL>" "./backups/source-$(date +%F-%H%M%S).dump"
bash scripts/migration/backup_postgres.sh "<TARGET_DB_URL>" "./backups/target-before-restore-$(date +%F-%H%M%S).dump"
```

## 2) Compare source vs target counts before restore

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
bash scripts/migration/compare_counts.sh "<SOURCE_DB_URL>" "<TARGET_DB_URL>"
```

Differences are expected here if target is incomplete.

## 3) Restore source data into Timeweb target

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
bash scripts/migration/restore_postgres.sh "<TARGET_DB_URL>" "./backups/source-YYYY-MM-DD-HHMMSS.dump"
```

Then reload PostgREST schema cache (in SQL editor on target DB):

```sql
notify pgrst, 'reload schema';
```

## 4) Compare counts after restore

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
bash scripts/migration/compare_counts.sh "<SOURCE_DB_URL>" "<TARGET_DB_URL>"
```

Goal: no diff for all critical tables (`auth.users`, `auth.identities`, `public.profiles`, chats/messages/catalogs).

## 5) Configure and deploy Next.js app-web on Timeweb

On server:

```bash
ssh root@186.246.2.104
cd /root/zeip/app
```

Create app env from template:

```bash
cp /root/zeip/app/deploy/timeweb/.env.app.example /root/zeip/app/deploy/timeweb/.env.app
```

Edit values:

- `NEXT_PUBLIC_SUPABASE_URL=https://supabase.zeip.ru`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<target self-hosted key>`

Build and run:

```bash
cd /root/zeip/app/deploy/timeweb
docker compose -f docker-compose.app.yml up -d --build
docker ps
```

## 6) SMTP and email confirmation (required for production)

Edit:

```bash
ssh root@186.246.2.104
cd /root/zeip/supabase-stack
nano .env
```

Set SMTP values in `.env` (example placeholders):

```env
GOTRUE_SMTP_HOST=smtp.your-provider.ru
GOTRUE_SMTP_PORT=587
GOTRUE_SMTP_USER=your-user
GOTRUE_SMTP_PASS=your-pass
GOTRUE_SMTP_ADMIN_EMAIL=noreply@zeip.ru
GOTRUE_SMTP_SENDER_NAME=Zeip
ENABLE_EMAIL_AUTOCONFIRM=false
```

Important: recreate auth container to apply env:

```bash
docker compose up -d --force-recreate auth
docker compose restart kong
docker inspect supabase-auth --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E 'GOTRUE_SMTP|AUTOCONFIRM'
```

Verify registration email flow in app.

## 7) API smoke checks against target self-hosted Supabase

From Mac:

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
bash scripts/migration/smoke_api.sh "https://supabase.zeip.ru" "<ANON_OR_PUBLISHABLE_KEY>"
```

Expect non-404 responses for catalogs, posts, locations, profiles.

## 8) DNS cutover

At DNS provider:

- `zeip.ru` -> Timeweb frontend IP (where Caddy/Nginx routes to `app-web`).
- Keep `supabase.zeip.ru` pointed to Timeweb Supabase endpoint.

After DNS propagation:

- Open `https://zeip.ru`.
- Verify in browser network that API calls go to `https://supabase.zeip.ru`.

## 9) Rollback

If incident occurs:

1. Revert `zeip.ru` DNS to previous production endpoint.
2. Restore target backup:

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
bash scripts/migration/restore_postgres.sh "<TARGET_DB_URL>" "./backups/target-before-restore-YYYY-MM-DD-HHMMSS.dump"
```

3. `notify pgrst, 'reload schema';`

## 10) Security checklist

- Never expose `SERVICE_ROLE_KEY` in frontend env.
- Keep only anon/publishable key in `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Rotate any leaked keys.
- Keep scheduled backups for DB and Supabase volumes.

## 11) Post-migration operations (close remaining todos)

Server login from Mac:

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
ssh root@186.246.2.104
```

Validate SMTP env before recreating auth:

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
chmod +x scripts/migration/check_smtp_env.sh
ssh root@186.246.2.104 "bash -s" <<'EOF'
set -e
cd /root/zeip/my-app
bash scripts/migration/check_smtp_env.sh /root/zeip/supabase-stack/.env
cd /root/zeip/supabase-stack
docker compose up -d --force-recreate auth kong
docker compose ps
EOF
```

Install daily backup cron on server:

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
chmod +x scripts/migration/backup_self_hosted_supabase.sh scripts/migration/install_backup_cron.sh
ssh root@186.246.2.104 "bash -s" <<'EOF'
set -e
cd /root/zeip/my-app
bash scripts/migration/install_backup_cron.sh /root/zeip/my-app
EOF
```

Final healthcheck:

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
chmod +x scripts/migration/healthcheck_timeweb.sh
bash scripts/migration/healthcheck_timeweb.sh "https://zeip.ru" "https://supabase.zeip.ru"
```

## 12) Web Push (личные сообщения)

Скрипт в репозитории: [`supabase/sql/2026-05-08-web-push.sql`](../supabase/sql/2026-05-08-web-push.sql). Выполнить **целиком** в SQL Editor self-hosted Supabase (`https://supabase.zeip.ru` → SQL).

После выполнения задать секрет (совпадает с `INTERNAL_PUSH_SECRET` в `.env.app`):

```sql
update public.app_config
set value = '<длинная_случайная_строка>'
where key = 'push_internal_secret';
```

Проверить URL диспетчера:

```sql
select key, value from public.app_config;
-- push_dispatch_url: https://zeip.ru/api/push/dispatch
```

На сервере в `deploy/timeweb/.env.app` заполнить переменные из шаблона [`deploy/timeweb/.env.app.example`](../deploy/timeweb/.env.app.example). VAPID:

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
npx web-push generate-vapid-keys
```

Пересборка приложения на сервере (обязательно `--env-file`, иначе `NEXT_PUBLIC_*` не попадут в `next build` и push на клиенте сломается):

```bash
cd /root/zeip/my-app
docker compose --env-file deploy/timeweb/.env.app -f deploy/timeweb/docker-compose.app.yml up -d --build
```

Проверка: два аккаунта, включить push в «Мои чаты», отправить сообщение — уведомление; клик открывает чат по `/?chat=` с id профиля отправителя.

## 13) Дисковое место (диагностика и очистка)

Связанное: [`deploy/timeweb/README-disk-maintenance.md`](../deploy/timeweb/README-disk-maintenance.md), скрипт [`scripts/migration/timeweb_disk_maintenance.sh`](../scripts/migration/timeweb_disk_maintenance.sh).

С Mac (`YOUR_IP` замените на хост VPS):

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
chmod +x scripts/migration/timeweb_disk_maintenance.sh
ssh root@YOUR_IP 'bash -s' < scripts/migration/timeweb_disk_maintenance.sh diagnose
```

Подробнее: команды `docker-prune`, `rotate-backups`, `print-log-limits-json`, `system-cleanup` описаны в `README-disk-maintenance.md`.

Ежедневный бэкап Supabase (`backup_self_hosted_supabase.sh`) после успеха оставляет не более **`KEEP_BACKUPS`** файлов `supabase_*.dump` (по умолчанию `14`; задать в cron строке переменную окружения перед вызовом скрипта при необходимости).
