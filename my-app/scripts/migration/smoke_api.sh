#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <supabase_url> <anon_or_publishable_key>"
  exit 1
fi

SUPABASE_URL="$1"
ANON_KEY="$2"

declare -a endpoints=(
  "/rest/v1/profiles?select=id&limit=1"
  "/rest/v1/profession_catalog?select=label&limit=5"
  "/rest/v1/industry_catalog?select=label&limit=5"
  "/rest/v1/subindustry_catalog?select=label&limit=5"
  "/rest/v1/posts?select=id&limit=5"
  "/rest/v1/locations?select=id&limit=5"
)

echo "Smoke checks against: $SUPABASE_URL"
for path in "${endpoints[@]}"; do
  code="$(
    curl -sS -o /dev/null -w "%{http_code}" \
      -H "apikey: $ANON_KEY" \
      -H "Authorization: Bearer $ANON_KEY" \
      "$SUPABASE_URL$path"
  )"
  printf "%-70s %s\n" "$path" "$code"
done
