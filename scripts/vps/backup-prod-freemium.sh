#!/usr/bin/env bash
# Снимок prod freemium перед переключением на paid_gate.
# Запуск на VPS: bash /root/zeip/my-app/scripts/vps/backup-prod-freemium.sh
set -euo pipefail

ROOT="/root/zeip/my-app"
ENV_FILE="${ROOT}/deploy/timeweb/.env.app"
ENV_BACKUP="${ROOT}/deploy/timeweb/.env.app.freemium.bak"
COMPOSE_FILE="${ROOT}/deploy/timeweb/docker-compose.app.yml"
ROLLBACK_TAG="timeweb-app-web:freemium-rollback"
STAMP_FILE="${ROOT}/deploy/timeweb/.freemium-backup.stamp"

cd "${ROOT}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ОШИБКА: нет ${ENV_FILE}"
  exit 1
fi

echo "=== backup .env.app ==="
cp "${ENV_FILE}" "${ENV_BACKUP}"
echo "Сохранено: ${ENV_BACKUP}"

echo "=== backup Docker image app-web ==="
if docker image inspect timeweb-app-web:latest >/dev/null 2>&1; then
  docker tag timeweb-app-web:latest "${ROLLBACK_TAG}"
  echo "Образ: ${ROLLBACK_TAG}"
else
  echo "WARN: timeweb-app-web:latest не найден — пропуск tag образа"
fi

echo "=== git SHA ==="
GIT_SHA="$(git rev-parse HEAD)"
echo "HEAD=${GIT_SHA}"

cat > "${STAMP_FILE}" <<EOF
backup_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
git_sha=${GIT_SHA}
env_backup=${ENV_BACKUP}
docker_image=${ROLLBACK_TAG}
git_tag=prod-freemium-2026-08-10
EOF

echo "=== stop test container (optional) ==="
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" stop app-web-test 2>/dev/null || true

echo "Готово. Для отката: bash ${ROOT}/scripts/vps/rollback-prod-freemium.sh"
