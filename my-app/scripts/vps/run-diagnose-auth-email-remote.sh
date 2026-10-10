#!/usr/bin/env bash
# Запуск diagnose-auth-email.sh на VPS с Mac.
# Папка:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#   bash scripts/vps/run-diagnose-auth-email-remote.sh [test@gmail.com]
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST="${VPS_HOST:-root@186.246.2.104}"
TEST_TO="${1:-test@gmail.com}"
DIAG="${ROOT}/scripts/vps/diagnose-auth-email.sh"

cd "$ROOT"

REMOTE="cd /root/zeip/my-app && git pull --ff-only && bash scripts/vps/diagnose-auth-email.sh '${TEST_TO}'"

if [[ -n "${VPS_SSH_PASSWORD:-}" ]] && command -v expect >/dev/null 2>&1; then
  export VPS_SSH_PASSWORD
  expect "$ROOT/scripts/vps/ssh-with-password.expect" "$HOST" bash -c "$REMOTE"
else
  echo "=== SSH to VPS (enter password once) ==="
  ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "$HOST" bash -c "$REMOTE"
fi
