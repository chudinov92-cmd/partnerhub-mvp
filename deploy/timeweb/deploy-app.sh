#!/usr/bin/env bash
# Деплой Next.js на Timeweb. Запускать на VPS после ssh:
#   bash /root/zeip/my-app/deploy/timeweb/deploy-app.sh
set -euo pipefail

ROOT="/root/zeip/my-app"
ENV_FILE="${ROOT}/deploy/timeweb/.env.app"
COMPOSE_FILE="${ROOT}/deploy/timeweb/docker-compose.app.yml"

cd "${ROOT}"
echo "=== git pull ==="
git pull

run_sql_migration() {
  local file="$1"
  local label="$2"
  if [[ ! -f "${file}" ]]; then
    return 0
  fi
  echo "=== migration ${label} ==="
  docker exec -i supabase-db psql -U supabase_admin -d postgres < "${file}" || \
  docker exec -i supabase-db psql -U postgres -d postgres < "${file}" || true
}

run_sql_migration "${ROOT}/supabase/sql/2026-05-20-subscription.sql" "subscription"
run_sql_migration "${ROOT}/supabase/sql/2026-05-21-support.sql" "support"
run_sql_migration "${ROOT}/supabase/sql/2026-05-21-chats-insert-rls.sql" "chats-insert-rls"
run_sql_migration "${ROOT}/supabase/sql/2026-05-22-ensure-private-chat-rpc.sql" "ensure-private-chat-rpc"

echo "=== docker build (with .env.app) ==="
cd "${ROOT}/deploy/timeweb"
docker compose --env-file .env.app -f docker-compose.app.yml build --no-cache
docker compose --env-file .env.app -f docker-compose.app.yml up -d

echo "=== check /subscription ==="
sleep 3
curl -sI http://127.0.0.1:3001/subscription | head -5
docker logs app-web --tail 15
