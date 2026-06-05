#!/usr/bin/env bash
# Запуск плана очистки с Mac на VPS Zeip.
# Папка:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#
# Интерактивный SSH (пароль root):
#   bash scripts/vps/run-zeip-disk-cleanup-remote.sh
#
# С паролем из переменной (не коммитить пароль):
#   VPS_SSH_PASSWORD='***' bash scripts/vps/run-zeip-disk-cleanup-remote.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST="${VPS_HOST:-root@186.246.2.104}"
PLAN="${ROOT}/scripts/vps/zeip-disk-cleanup-plan.sh"

cd "$ROOT"

if [[ -n "${VPS_SSH_PASSWORD:-}" ]] && command -v sshpass >/dev/null 2>&1; then
  export SSHPASS="$VPS_SSH_PASSWORD"
  sshpass -e ssh -o StrictHostKeyChecking=accept-new "$HOST" 'bash -s' < "$PLAN"
elif [[ -n "${VPS_SSH_PASSWORD:-}" ]] && command -v expect >/dev/null 2>&1; then
  export VPS_SSH_PASSWORD
  expect "$ROOT/scripts/vps/ssh-with-password.expect" "$HOST" "$PLAN"
else
  ssh -o StrictHostKeyChecking=accept-new "$HOST" 'bash -s' < "$PLAN"
fi
