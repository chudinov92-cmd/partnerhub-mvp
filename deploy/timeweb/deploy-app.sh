#!/usr/bin/env bash
# Деплой Next.js на Timeweb. Запускать на VPS после ssh:
#   bash /root/zeip/my-app/deploy/timeweb/deploy-app.sh
set -euo pipefail

ROOT="/root/zeip/my-app"
ENV_FILE="${ROOT}/deploy/timeweb/.env.app"
COMPOSE_FILE="${ROOT}/deploy/timeweb/docker-compose.app.yml"

cd "${ROOT}"
echo "=== git pull ==="
OLD_HEAD="$(git rev-parse HEAD)"
git pull --ff-only
NEW_HEAD="$(git rev-parse HEAD)"

# Bash уже прочитал этот файл до pull — после обновления перезапускаем скрипт.
if [[ "${OLD_HEAD}" != "${NEW_HEAD}" ]] && [[ -z "${ZEIP_DEPLOY_REEXEC:-}" ]]; then
  echo "=== deploy script updated (${OLD_HEAD:0:7} -> ${NEW_HEAD:0:7}), re-run ==="
  export ZEIP_DEPLOY_REEXEC=1
  exec bash "${ROOT}/deploy/timeweb/deploy-app.sh"
fi

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
run_sql_migration "${ROOT}/supabase/sql/2026-05-25-useful-contacts.sql" "useful-contacts"
run_sql_migration "${ROOT}/supabase/sql/2026-05-25-profession-demand-analytics.sql" "profession-demand-analytics"
run_sql_migration "${ROOT}/supabase/sql/2026-05-26-chat-members-last-read.sql" "chat-members-last-read"
run_sql_migration "${ROOT}/supabase/sql/2026-06-02-add-engineering-professions.sql" "engineering-professions"
run_sql_migration "${ROOT}/supabase/sql/2026-06-03-add-engineering-professions-batch2.sql" "engineering-professions-batch2"
run_sql_migration "${ROOT}/supabase/sql/2026-07-15-subscription-payments.sql" "subscription-payments"
run_sql_migration "${ROOT}/docs/profile_views_content_version.sql" "profile-views-content-version"
run_sql_migration "${ROOT}/docs/profile_work_public_read.sql" "profile-work-public-read"
run_sql_migration "${ROOT}/docs/profile_last_name_private.sql" "profile-last-name-private"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ОШИБКА: нет файла ${ENV_FILE}"
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

echo "=== docker build (with .env.app) ==="
cd "${ROOT}/deploy/timeweb"

# --no-cache каждый раз тянет node:20-alpine с Docker Hub → 429 на VPS без login.
# Кэш слоёв сохраняем; базовый образ не перекачиваем, если уже есть локально.
# На VPS docker compose принимает только true/false (не missing/never).
COMPOSE_BUILD=(--env-file .env.app -f docker-compose.app.yml build)
if docker image inspect public.ecr.aws/docker/library/node:20-alpine >/dev/null 2>&1 || \
   docker image inspect node:20-alpine >/dev/null 2>&1; then
  COMPOSE_BUILD+=(--pull=false)
  echo "Базовый образ node:20-alpine уже локально — pull отключён"
else
  COMPOSE_BUILD+=(--pull=true)
  echo "Базовый образ node:20-alpine не найден — pull включён"
fi

docker compose "${COMPOSE_BUILD[@]}"
docker compose --env-file .env.app -f docker-compose.app.yml up -d

echo "=== check /subscription ==="
sleep 3
curl -sI http://127.0.0.1:3001/subscription | head -5
docker logs app-web --tail 15
