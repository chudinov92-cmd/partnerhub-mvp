#!/usr/bin/env bash
# Read-only проверка recovery_sent_at через Admin API (без SQL / SSH).
# Папка:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#   bash scripts/vps/check-recovery-users.sh v.chudinov.direct@yandex.ru vova1992_92@mail.ru
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.local}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found"
  exit 1
fi

SRK=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')
URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')

if [[ -z "$SRK" || -z "$URL" ]]; then
  echo "Error: missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL"
  exit 1
fi

if [[ $# -eq 0 ]]; then
  echo "Usage: $0 <email> [email2 ...]"
  exit 1
fi

TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

curl -sS "${URL}/auth/v1/admin/users?page=1&per_page=1000" \
  -H "apikey: ${SRK}" \
  -H "Authorization: Bearer ${SRK}" > "$TMP"

python3 - "$@" "$TMP" <<'PY'
import json, sys

targets = {e.lower() for e in sys.argv[1:-1]}
path = sys.argv[-1]
with open(path) as f:
    data = json.load(f)
users = data.get("users") or []
found = {u.get("email", "").lower(): u for u in users if u.get("email")}

for email in sorted(targets):
    print(f"=== {email} ===")
    u = found.get(email)
    if not u:
        print("NOT FOUND in first 1000 users — проверьте SQL на VPS")
        continue
    print("recovery_sent_at:", u.get("recovery_sent_at"))
    print("email_confirmed_at:", u.get("email_confirmed_at"))
    print("deleted_at:", u.get("deleted_at"))
    print()
PY
