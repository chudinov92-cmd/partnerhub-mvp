#!/usr/bin/env bash
# Hard purge профилей на prod: оставить только 5 auth-пользователей из whitelist.
#
# Запуск с Mac (локальный терминал):
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#   bash scripts/vps/run-purge-profiles-remote.sh
#
# С паролем:
#   VPS_SSH_PASSWORD='***' bash scripts/vps/run-purge-profiles-remote.sh
#
# Если уже на VPS:
#   cd /root/zeip/my-app
#   bash scripts/vps/purge-profiles-remote-body.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST="${VPS_HOST:-root@186.246.2.104}"
REMOTE_BODY="${ROOT}/scripts/vps/purge-profiles-remote-body.sh"

cd "$ROOT"

if [[ -n "${VPS_SSH_PASSWORD:-}" ]] && command -v sshpass >/dev/null 2>&1; then
  export SSHPASS="$VPS_SSH_PASSWORD"
  sshpass -e ssh -o StrictHostKeyChecking=accept-new "$HOST" "bash -s" < "$REMOTE_BODY"
elif [[ -n "${VPS_SSH_PASSWORD:-}" ]] && command -v expect >/dev/null 2>&1; then
  export VPS_SSH_PASSWORD
  expect "$ROOT/scripts/vps/ssh-with-password.expect" "$HOST" "$REMOTE_BODY"
else
  ssh -o StrictHostKeyChecking=accept-new "$HOST" "bash -s" < "$REMOTE_BODY"
fi
