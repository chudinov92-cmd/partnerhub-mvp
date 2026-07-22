# Zeip (`my-app`)

Next.js 16 приложение платформы Zeip: карта партнёров, профили, чаты, подписка Pro.

## Getting Started

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000). Нужен локальный `.env.local` (см. переменные в `docs/ai_context.md`).

## Production (Timeweb)

Один VPS: `zeip.ru` (Next.js) + `supabase.zeip.ru` (self-hosted Supabase).

- runbook: `docs/timeweb-migration-runbook.md`
- compose: `deploy/timeweb/docker-compose.app.yml`
- деплой с Mac: `bash scripts/vps/run-deploy-remote.sh`
- на сервере: `cd /root/zeip/my-app && git pull --ff-only && bash deploy/timeweb/deploy-app.sh`

Вспомогательные скрипты:

- `scripts/migration/check_smtp_env.sh`
- `scripts/migration/backup_self_hosted_supabase.sh`
- `scripts/migration/install_backup_cron.sh`
- `scripts/migration/healthcheck_timeweb.sh`

**Web Push:** SQL `supabase/sql/2026-05-08-web-push.sql` — §12 в runbook; в `.env.local` / `.env.app` нужны VAPID + `SUPABASE_SERVICE_ROLE_KEY` + `INTERNAL_PUSH_SECRET`.

## Docs

- `docs/ai_context.md` — архитектура и домен
- корневой `../ai_docs/` — продуктовые и UX-документы монорепо
