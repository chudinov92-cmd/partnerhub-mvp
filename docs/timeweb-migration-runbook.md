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
