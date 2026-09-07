#!/usr/bin/env bash
# Запуск fix-auth-email-on-vps.sh на VPS с Mac.
# Папка:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#   bash scripts/vps/run-fix-auth-email-remote.sh
#   bash scripts/vps/run-fix-auth-email-remote.sh --smtp-587
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST="${VPS_HOST:-root@186.246.2.104}"
EXTRA_ARGS="${*:-}"

cd "$ROOT"

REMOTE="cd /root/zeip/my-app && git pull --ff-only && bash scripts/vps/fix-auth-email-on-vps.sh ${EXTRA_ARGS} && bash scripts/vps/diagnose-auth-email.sh test@gmail.com"

if [[ -n "${VPS_SSH_PASSWORD:-}" ]] && command -v expect >/dev/null 2>&1; then
  export VPS_SSH_PASSWORD
  expect "$ROOT/scripts/vps/ssh-with-password.expect" "$HOST" bash -c "$REMOTE"
else
  echo "=== SSH to VPS (enter password once) ==="
  ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "$HOST" bash -c "$REMOTE"
fi
