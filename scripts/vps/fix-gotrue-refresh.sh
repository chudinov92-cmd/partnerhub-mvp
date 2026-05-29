#!/usr/bin/env bash
# Применить настройки refresh-токена GoTrue на VPS Zeip.
# Запуск с Mac (нужен SSH-доступ):
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app && bash scripts/vps/fix-gotrue-refresh.sh

set -euo pipefail

VPS_HOST="${VPS_HOST:-root@186.246.2.104}"
STACK_DIR="${STACK_DIR:-/root/zeip/supabase-stack}"

ssh "$VPS_HOST" bash -s <<'REMOTE'
set -euo pipefail
cd /root/zeip/supabase-stack

echo "=== auth logs (refresh/errors) ==="
docker compose logs auth --tail 200 | grep -iE "refresh|token|panic|error" || true

echo "=== current REFRESH_TOKEN env ==="
docker inspect supabase-auth --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E 'GOTRUE_JWT_EXP|REFRESH_TOKEN' || true

for kv in \
  GOTRUE_SECURITY_REFRESH_TOKEN_ROTATION_ENABLED=true \
  GOTRUE_SECURITY_REFRESH_TOKEN_REUSE_INTERVAL=10
do
  k="${kv%%=*}"
  if grep -q "^${k}=" .env; then
    sed -i "s|^${k}=.*|${kv}|" .env
  else
    echo "$kv" >> .env
  fi
done

docker compose up -d --force-recreate auth
docker compose restart kong

echo "=== applied env ==="
docker inspect supabase-auth --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E 'GOTRUE_JWT_EXP|REFRESH_TOKEN'
REMOTE

echo "Done. Test refresh from Mac:"
echo 'curl -i -X POST "https://supabase.zeip.ru/auth/v1/token?grant_type=refresh_token" \'
echo '  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Content-Type: application/json" \'
echo '  -d "{\"refresh_token\":\"<refresh_token>\"}"'
