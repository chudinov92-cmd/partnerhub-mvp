#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "" ]]; then
  echo "Usage: $0 <ANON_KEY>"
  echo "Example: $0 \"eyJ...\""
  exit 1
fi

ANON_KEY="$1"

echo "=== zeip.ru ==="
curl -w 'dns=%{time_namelookup} connect=%{time_connect} tls=%{time_appconnect} ttfb=%{time_starttransfer} total=%{time_total} code=%{http_code}\n' \
  -o /dev/null -s "https://zeip.ru/"

echo "=== supabase.zeip.ru/rest/v1/ ==="
curl -w 'ttfb=%{time_starttransfer} total=%{time_total} code=%{http_code}\n' \
  -o /dev/null -s \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  "https://supabase.zeip.ru/rest/v1/"
