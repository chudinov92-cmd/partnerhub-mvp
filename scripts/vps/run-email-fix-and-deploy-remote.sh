#!/usr/bin/env bash
# Полный фикс email на VPS: GoTrue SMTP + templates + deploy-app (SQL hairpin URLs).
# Папка:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#   bash scripts/vps/run-email-fix-and-deploy-remote.sh
#   VPS_SSH_PASSWORD='***' bash scripts/vps/run-email-fix-and-deploy-remote.sh
#   bash scripts/vps/run-email-fix-and-deploy-remote.sh --smtp-587
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST="${VPS_HOST:-root@186.246.2.104}"
EXTRA_ARGS="${*:-}"

cd "$ROOT"

REMOTE="cd /root/zeip/my-app && git pull --ff-only && bash scripts/vps/fix-auth-email-on-vps.sh ${EXTRA_ARGS} && bash deploy/timeweb/deploy-app.sh && bash scripts/vps/diagnose-auth-email.sh test@gmail.com"

if [[ -n "${VPS_SSH_PASSWORD:-}" ]] && command -v expect >/dev/null 2>&1; then
  export VPS_SSH_PASSWORD
  expect "$ROOT/scripts/vps/ssh-with-password.expect" "$HOST" bash -c "$REMOTE"
elif [[ -n "${VPS_SSH_PASSWORD:-}" ]] && command -v sshpass >/dev/null 2>&1; then
  export SSHPASS="$VPS_SSH_PASSWORD"
  sshpass -e ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "$HOST" bash -c "$REMOTE"
else
  echo "=== SSH to VPS (enter root password) ==="
  ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "$HOST" bash -c "$REMOTE"
fi
