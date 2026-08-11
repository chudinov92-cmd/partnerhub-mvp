#!/usr/bin/env bash
# Параллельный стенд: zeip.ru (:3001) + test.zeip.ru (:3002) на одном VPS.
#
# Запускать НА VPS:
#   cd /root/zeip/my-app && git fetch && git checkout paid-access && git pull --ff-only
#   bash scripts/vps/enable-parallel-test-domain.sh
#
# С Mac:
#   cd "/Users/vladimirchudinov/Downloads/Zeip Paid"
#   bash scripts/vps/run-enable-parallel-test-remote.sh
#
# DNS (Timeweb): A test → 186.246.2.104; @ и www не трогать.
set -euo pipefail

CADDYFILE="${CADDYFILE:-/etc/caddy/Caddyfile}"
SUPABASE_ENV="${SUPABASE_ENV:-/root/zeip/supabase-stack/.env}"
APP_ENV_TEST="${APP_ENV_TEST:-/root/zeip/my-app/deploy/timeweb/.env.app.test}"

echo "=== 1. Caddy: zeip.ru + test.zeip.ru (параллельно) ==="
cat > "${CADDYFILE}" <<'CADDY'
zeip.ru, www.zeip.ru {
  encode gzip zstd
  reverse_proxy 127.0.0.1:3001
}

test.zeip.ru {
  encode gzip zstd
  reverse_proxy 127.0.0.1:3002
}

supabase.zeip.ru {
  encode gzip zstd
  reverse_proxy 127.0.0.1:8000
}
CADDY

caddy validate --config "${CADDYFILE}"
systemctl reload caddy
echo "Caddy OK"

echo "=== 2. GoTrue: allowlist test.zeip.ru (SITE_URL остаётся zeip.ru) ==="
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
set_kv "ADDITIONAL_REDIRECT_URLS" "https://zeip.ru/**,https://test.zeip.ru/**,http://localhost:3000/**"
set_kv "API_EXTERNAL_URL" "https://supabase.zeip.ru"

cd /root/zeip/supabase-stack
docker compose up -d --force-recreate auth
docker compose restart kong
echo "GoTrue OK"

echo "=== 3. .env.app.test ==="
if [[ ! -f "${APP_ENV_TEST}" ]]; then
  echo "WARN: нет ${APP_ENV_TEST}"
  echo "Скопируйте deploy/timeweb/.env.app → .env.app.test и задайте:"
  echo "  NEXT_PUBLIC_ACCESS_MODE=paid_gate"
  echo "  NEXT_PUBLIC_SITE_URL=https://test.zeip.ru"
  echo "  NEXT_PUBLIC_EMAIL_AUTH_REDIRECT_ORIGIN=https://test.zeip.ru"
  echo "  ROBOKASSA_TEST_MODE=1"
else
  set_kv_file() {
    local file="$1"
    local key="$2"
    local val="$3"
    if grep -q "^${key}=" "${file}"; then
      sed -i "s|^${key}=.*|${key}=${val}|" "${file}"
    else
      echo "${key}=${val}" >> "${file}"
    fi
  }
  set_kv_file "${APP_ENV_TEST}" "NEXT_PUBLIC_ACCESS_MODE" "paid_gate"
  set_kv_file "${APP_ENV_TEST}" "NEXT_PUBLIC_SITE_URL" "https://test.zeip.ru"
  set_kv_file "${APP_ENV_TEST}" "NEXT_PUBLIC_EMAIL_AUTH_REDIRECT_ORIGIN" "https://test.zeip.ru"
  set_kv_file "${APP_ENV_TEST}" "ROBOKASSA_TEST_MODE" "1"
  echo "Обновлён ${APP_ENV_TEST}"
fi

echo ""
echo "=== Готово ==="
echo "Prod:  curl -sI https://zeip.ru/ | head -3"
echo "Test:  curl -sI https://test.zeip.ru/ | head -3"
echo "Деплой test-контейнера: bash deploy/timeweb/deploy-app-test.sh"
echo "Robokassa / VK Maps: см. deploy/timeweb/integrations-test-domain.md"
