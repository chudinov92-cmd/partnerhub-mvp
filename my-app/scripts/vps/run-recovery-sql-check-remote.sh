#!/usr/bin/env bash
# SQL-проверка recovery_sent_at на VPS (inline, без git pull).
# Папка на Mac:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#   bash scripts/vps/run-recovery-sql-check-remote.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST="${VPS_HOST:-root@186.246.2.104}"

run_ssh() {
  ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "$HOST" "bash -s" << 'EOF'
set -euo pipefail
echo "=== auth.users (mail.ru + yandex) ==="
docker exec supabase-db psql -U postgres -d postgres -c \
  "SELECT email, recovery_sent_at, email_confirmed_at, deleted_at
   FROM auth.users
   WHERE email IN ('vova1992_92@mail.ru', 'v.chudinov.direct@yandex.ru')
   ORDER BY email;"
EOF
}

cd "$ROOT"

if [[ -n "${VPS_SSH_PASSWORD:-}" ]] && command -v sshpass >/dev/null 2>&1; then
  export SSHPASS="$VPS_SSH_PASSWORD"
  sshpass -e ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "$HOST" "bash -s" << 'EOF'
set -euo pipefail
echo "=== auth.users (mail.ru + yandex) ==="
docker exec supabase-db psql -U postgres -d postgres -c \
  "SELECT email, recovery_sent_at, email_confirmed_at, deleted_at
   FROM auth.users
   WHERE email IN ('vova1992_92@mail.ru', 'v.chudinov.direct@yandex.ru')
   ORDER BY email;"
EOF
else
  echo "=== SSH to VPS (enter root password) ==="
  run_ssh
fi
