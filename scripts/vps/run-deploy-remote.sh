#!/usr/bin/env bash
# Деплой Zeip на VPS Timeweb с Mac.
# Папка:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#
# Интерактивный SSH (пароль root):
#   bash scripts/vps/run-deploy-remote.sh
#
# С паролем из переменной (не коммитить пароль):
#   VPS_SSH_PASSWORD='***' bash scripts/vps/run-deploy-remote.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST="${VPS_HOST:-root@186.246.2.104}"
DEPLOY="${ROOT}/deploy/timeweb/deploy-app.sh"

cd "$ROOT"

if [[ -n "${VPS_SSH_PASSWORD:-}" ]] && command -v sshpass >/dev/null 2>&1; then
  export SSHPASS="$VPS_SSH_PASSWORD"
  sshpass -e ssh -o StrictHostKeyChecking=accept-new "$HOST" "bash /root/zeip/my-app/deploy/timeweb/deploy-app.sh"
elif [[ -n "${VPS_SSH_PASSWORD:-}" ]] && command -v expect >/dev/null 2>&1; then
  export VPS_SSH_PASSWORD
  expect "$ROOT/scripts/vps/ssh-with-password.expect" "$HOST" "$DEPLOY"
else
  ssh -o StrictHostKeyChecking=accept-new "$HOST" "bash /root/zeip/my-app/deploy/timeweb/deploy-app.sh"
fi
