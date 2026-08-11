#!/usr/bin/env bash
# Быстрый откат prod zeip.ru на freemium (образ + env).
# Запуск на VPS: bash /root/zeip/my-app/scripts/vps/rollback-prod-freemium.sh
set -euo pipefail

ROOT="/root/zeip/my-app"
ENV_FILE="${ROOT}/deploy/timeweb/.env.app"
ENV_BACKUP="${ROOT}/deploy/timeweb/.env.app.freemium.bak"
COMPOSE_FILE="${ROOT}/deploy/timeweb/docker-compose.app.yml"
ROLLBACK_TAG="timeweb-app-web:freemium-rollback"
GIT_TAG="prod-freemium-2026-08-10"

cd "${ROOT}"

if [[ ! -f "${ENV_BACKUP}" ]]; then
  echo "ОШИБКА: нет backup env ${ENV_BACKUP}"
  echo "Сначала: bash ${ROOT}/scripts/vps/backup-prod-freemium.sh"
  exit 1
fi

if ! docker image inspect "${ROLLBACK_TAG}" >/dev/null 2>&1; then
  echo "ОШИБКА: нет Docker-образа ${ROLLBACK_TAG}"
  echo "Полный откат: git checkout ${GIT_TAG} && cp ${ENV_BACKUP} ${ENV_FILE} && bash deploy/timeweb/deploy-app.sh"
  exit 1
fi

echo "=== restore .env.app ==="
cp "${ENV_BACKUP}" "${ENV_FILE}"

echo "=== restore Docker image ==="
docker tag "${ROLLBACK_TAG}" timeweb-app-web:latest

echo "=== restart app-web (без rebuild) ==="
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d app-web

echo "=== smoke ==="
sleep 2
curl -sI http://127.0.0.1:3001/subscription | head -3
curl -sI https://zeip.ru/subscription | head -3 || true

echo "Откат freemium выполнен (Docker image + env)."
echo "Синхронизация кода (опционально): git checkout ${GIT_TAG}"
