#!/usr/bin/env bash
# Триггер POST /auth/v1/recover с Mac (для проверки логов auth на VPS).
# Папка:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#   bash scripts/vps/trigger-recover-test.sh user@gmail.com
#
set -euo pipefail

EMAIL="${1:-}"
if [[ -z "$EMAIL" ]]; then
  echo "Usage: $0 <email>"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.local}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found"
  exit 1
fi

ANON=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')
URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')

if [[ -z "$ANON" || -z "$URL" ]]; then
  echo "Error: missing NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_URL in $ENV_FILE"
  exit 1
fi

echo "POST ${URL}/auth/v1/recover → ${EMAIL}"
curl -sS -w "\nHTTP %{http_code}\n" -X POST "${URL}/auth/v1/recover" \
  -H "apikey: ${ANON}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\"}"

echo ""
echo "On VPS watch logs:"
echo "  docker compose -f /root/zeip/supabase-stack/docker-compose.yml logs auth --since 2m | tail -30"
