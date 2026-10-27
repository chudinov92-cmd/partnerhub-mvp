#!/usr/bin/env bash
# Переключение prod zeip.ru на paid_gate (после merge в main).
# Запуск на VPS: bash /root/zeip/my-app/scripts/vps/deploy-prod-paid-gate.sh
set -euo pipefail

ROOT="/root/zeip/my-app"
ENV_FILE="${ROOT}/deploy/timeweb/.env.app"
COMPOSE_FILE="${ROOT}/deploy/timeweb/docker-compose.app.yml"

cd "${ROOT}"

echo "=== git pull ==="
git pull --ff-only

echo "=== backup freemium (если ещё нет) ==="
if [[ ! -f "${ROOT}/deploy/timeweb/.env.app.freemium.bak" ]]; then
  bash "${ROOT}/scripts/vps/backup-prod-freemium.sh"
else
  echo "Backup уже есть — пропуск"
fi

echo "=== NEXT_PUBLIC_ACCESS_MODE=paid_gate ==="
if grep -q '^NEXT_PUBLIC_ACCESS_MODE=' "${ENV_FILE}"; then
  sed -i 's/^NEXT_PUBLIC_ACCESS_MODE=.*/NEXT_PUBLIC_ACCESS_MODE=paid_gate/' "${ENV_FILE}"
else
  echo "NEXT_PUBLIC_ACCESS_MODE=paid_gate" >> "${ENV_FILE}"
fi
grep NEXT_PUBLIC_ACCESS_MODE "${ENV_FILE}"

echo "=== deploy prod ==="
bash "${ROOT}/deploy/timeweb/deploy-app.sh"

echo "=== stop test container ==="
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" stop app-web-test 2>/dev/null || true

echo "=== smoke ==="
curl -sI https://zeip.ru/ | head -3
curl -sI https://zeip.ru/subscription | head -3

echo "Prod paid_gate задеплоен. Откат: bash ${ROOT}/scripts/vps/rollback-prod-freemium.sh"
