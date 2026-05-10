#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <app_url> <supabase_url>"
  echo "Example: $0 https://zeip.ru https://supabase.zeip.ru"
  exit 1
fi

APP_URL="$1"
SUPABASE_URL="$2"

echo "Checking app: $APP_URL"
curl -sS -I "$APP_URL" | sed -n '1,12p'
echo

echo "Checking Supabase REST (without key, 401 is expected): $SUPABASE_URL/rest/v1/"
curl -sS -I "$SUPABASE_URL/rest/v1/" | sed -n '1,12p'
echo

echo "Done."
