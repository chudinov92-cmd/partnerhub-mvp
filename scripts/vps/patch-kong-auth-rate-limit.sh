#!/usr/bin/env bash
# Rate-limit на auth-v1 в declarative kong.yml (DB-less Kong).
#
# Запуск на VPS:
#   cd /root/zeip/my-app && bash scripts/vps/patch-kong-auth-rate-limit.sh
#
# С Mac:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#   bash scripts/vps/run-patch-kong-auth-rate-limit-remote.sh
set -euo pipefail

STACK_DIR="${STACK_DIR:-/root/zeip/supabase-stack}"
KONG_YML="${STACK_DIR}/volumes/api/kong.yml"

if [[ ! -f "${KONG_YML}" ]]; then
  echo "ОШИБКА: нет ${KONG_YML}"
  exit 1
fi

if grep -q 'name: rate-limiting' "${KONG_YML}"; then
  echo "rate-limiting уже есть в ${KONG_YML}"
else
  cp "${KONG_YML}" "${KONG_YML}.bak.$(date +%F-%H%M)"
  sed -i '/## Secure PostgREST routes/i\      - name: rate-limiting\
        config:\
          minute: 10\
          policy: local\
          limit_by: ip\
          hide_client_headers: true' "${KONG_YML}"
  echo "OK: rate-limiting добавлен перед ## Secure PostgREST routes (auth-v1 plugins)"
fi

cd "${STACK_DIR}"
docker compose restart kong
sleep 5
docker logs supabase-kong --tail 15

APP_ENV="${APP_ENV:-/root/zeip/my-app/deploy/timeweb/.env.app}"
if [[ -f "${APP_ENV}" ]]; then
  ANON=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY "${APP_ENV}" | cut -d= -f2- | tr -d "\"'")
  echo "=== 15 login attempts (supabase.zeip.ru) ==="
  for i in $(seq 1 15); do
    code=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST "https://supabase.zeip.ru/auth/v1/token?grant_type=password" \
      -H "apikey: ${ANON}" -H "Content-Type: application/json" \
      -d '{"email":"scan@example.com","password":"wrong"}')
    echo "$i -> HTTP $code"
  done
fi

echo "Готово."
