#!/usr/bin/env bash
# С Mac: SQL + GoTrue/Kong + деплой защиты входа.
# Папка:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#
# Интерактивно:
#   bash scripts/vps/run-auth-login-harden-remote.sh
#
# С паролем:
#   VPS_SSH_PASSWORD='***' bash scripts/vps/run-auth-login-harden-remote.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST="${VPS_HOST:-root@186.246.2.104}"
BODY="${ROOT}/scripts/vps/remote-auth-login-harden-body.sh"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new)

cd "$ROOT"

if [[ -n "${VPS_SSH_PASSWORD:-}" ]] && command -v sshpass >/dev/null 2>&1; then
  export SSHPASS="$VPS_SSH_PASSWORD"
  sshpass -e ssh "${SSH_OPTS[@]}" "$HOST" bash -s < "$BODY"
elif [[ -n "${VPS_SSH_PASSWORD:-}" ]] && command -v expect >/dev/null 2>&1; then
  export VPS_SSH_PASSWORD
  expect "$ROOT/scripts/vps/ssh-with-password.expect" "$HOST" "$BODY"
else
  ssh "${SSH_OPTS[@]}" "$HOST" bash -s < "$BODY"
fi

echo "Done."
