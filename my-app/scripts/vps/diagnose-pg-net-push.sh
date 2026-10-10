#!/usr/bin/env bash
# Диагностика pg_net → push dispatch на self-hosted Supabase.
# Запуск на VPS: bash /root/zeip/my-app/scripts/vps/diagnose-pg-net-push.sh
set -euo pipefail

echo "=== pg_net extension ==="
docker exec -i supabase-db psql -U postgres -d postgres -c \
  "SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_net';"

echo "=== worker (может ругаться на self-hosted) ==="
docker exec -i supabase-db psql -U postgres -d postgres -c \
  "SELECT net.check_worker_is_up();" 2>&1 || true

echo "=== очередь и ответы ==="
docker exec -i supabase-db psql -U postgres -d postgres <<'SQL'
SELECT count(*) AS queue_pending FROM net.http_request_queue;
SELECT id, status_code, left(url, 55) AS url, left(content, 60) AS resp, created
FROM net._http_response
ORDER BY id DESC LIMIT 5;
SQL

echo "=== app_config push ==="
docker exec -i supabase-db psql -U postgres -d postgres -c \
  "SELECT key, value FROM public.app_config WHERE key LIKE 'push_%';"
