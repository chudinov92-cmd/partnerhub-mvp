#!/usr/bin/env bash
# Деплой test-стенда (app-web-test, :3002, paid_gate).
# На VPS после checkout paid-access:
#   bash /root/zeip/my-app/deploy/timeweb/deploy-app-test.sh
set -euo pipefail

ROOT="/root/zeip/my-app"
ENV_FILE="${ROOT}/deploy/timeweb/.env.app.test"
COMPOSE_FILE="${ROOT}/deploy/timeweb/docker-compose.app.yml"

cd "${ROOT}"
echo "=== git pull (paid-access) ==="
git fetch origin
git checkout paid-access
git pull --ff-only

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ОШИБКА: нет ${ENV_FILE}"
  echo "Скопируйте .env.app → .env.app.test и задайте NEXT_PUBLIC_ACCESS_MODE=paid_gate"
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "${ENV_FILE}"
set +a

for var in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY NEXT_PUBLIC_SUPPORT_PROFILE_ID NEXT_PUBLIC_VK_MAPS_API_KEY SUPABASE_SERVICE_ROLE_KEY; do
  if [[ -z "${!var:-}" ]] || [[ "${!var}" == REPLACE_* ]]; then
    echo "ОШИБКА: в ${ENV_FILE} не задано или плейсхолдер: ${var}"
    exit 1
  fi
done

if [[ "${NEXT_PUBLIC_ACCESS_MODE:-}" != "paid_gate" ]]; then
  echo "WARN: NEXT_PUBLIC_ACCESS_MODE не paid_gate в ${ENV_FILE}"
fi

echo "=== docker build app-web-test ==="
cd "${ROOT}/deploy/timeweb"
docker compose --env-file .env.app.test -f docker-compose.app.yml build app-web-test
docker compose --env-file .env.app.test -f docker-compose.app.yml up -d app-web-test

echo "=== check test :3002 ==="
sleep 3
curl -sI http://127.0.0.1:3002/ | head -5
docker logs app-web-test --tail 15
