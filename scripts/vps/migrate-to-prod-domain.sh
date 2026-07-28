#!/usr/bin/env bash
# Возврат приложения на zeip.ru (VPS: Caddy + GoTrue).
#
# ⚠️  Запускать НА VPS (после ssh root@186.246.2.104), не с Mac:
#   cd /root/zeip/my-app && git pull --ff-only && bash scripts/vps/migrate-to-prod-domain.sh
#
# С Mac (без ручного SSH) — другой скрипт:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#   bash scripts/vps/run-migrate-prod-domain-remote.sh
#
# DNS (вручную в панели Timeweb ДО или ПОСЛЕ):
#   zeip.ru, www.zeip.ru  A  186.246.2.104
#   удалить A/AAAA для test (закрыть test.zeip.ru)
set -euo pipefail

CADDYFILE="${CADDYFILE:-/etc/caddy/Caddyfile}"
SUPABASE_ENV="${SUPABASE_ENV:-/root/zeip/supabase-stack/.env}"
APP_ENV="${APP_ENV:-/root/zeip/my-app/deploy/timeweb/.env.app}"

echo "=== 1. Caddy: zeip.ru + www.zeip.ru ==="
cat > "${CADDYFILE}" <<'CADDY'
zeip.ru, www.zeip.ru {
  encode gzip zstd
  reverse_proxy 127.0.0.1:3001
}

# Kong: HTTP :8000, HTTPS :8443. Caddy уже снимает TLS — проксируем на :8000.
supabase.zeip.ru {
  encode gzip zstd
  reverse_proxy 127.0.0.1:8000
}
CADDY

caddy validate --config "${CADDYFILE}"
systemctl reload caddy
echo "Caddy OK"

echo "=== 2. Supabase Auth SITE_URL ==="
if [[ ! -f "${SUPABASE_ENV}" ]]; then
  echo "ОШИБКА: нет ${SUPABASE_ENV}"
  exit 1
fi

set_kv() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "${SUPABASE_ENV}"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "${SUPABASE_ENV}"
  else
    echo "${key}=${val}" >> "${SUPABASE_ENV}"
  fi
}

set_kv "SITE_URL" "https://zeip.ru"
set_kv "ADDITIONAL_REDIRECT_URLS" "https://zeip.ru/**,http://localhost:3000/**"
set_kv "API_EXTERNAL_URL" "https://supabase.zeip.ru"

cd /root/zeip/supabase-stack
docker compose up -d --force-recreate auth
docker compose restart kong
echo "GoTrue OK"

echo "=== 3. .env.app: публичные URL ==="
if [[ -f "${APP_ENV}" ]]; then
  set_kv "NEXT_PUBLIC_SITE_URL" "https://zeip.ru"
  set_kv "NEXT_PUBLIC_EMAIL_AUTH_REDIRECT_ORIGIN" "https://zeip.ru"
  echo "Обновлён ${APP_ENV} — пересоберите app: bash deploy/timeweb/deploy-app.sh"
else
  echo "WARN: нет ${APP_ENV}, добавьте NEXT_PUBLIC_SITE_URL и NEXT_PUBLIC_EMAIL_AUTH_REDIRECT_ORIGIN=https://zeip.ru"
fi

echo "=== 4. push_dispatch_url (SQL) ==="
SQL_PUSH="UPDATE public.app_config SET value = 'https://zeip.ru/api/push/dispatch' WHERE key = 'push_dispatch_url';"
if docker exec -i supabase-db psql -U supabase_admin -d postgres -c "${SQL_PUSH}" 2>/dev/null; then
  echo "SQL OK (supabase_admin)"
elif docker exec -i supabase-db psql -U postgres -d postgres -c "${SQL_PUSH}"; then
  echo "SQL OK (postgres)"
else
  echo "WARN: выполните вручную supabase/sql/2026-07-28-prod-domain-push-dispatch.sql"
fi

echo "=== Готово. Проверка: curl -I https://zeip.ru ==="
