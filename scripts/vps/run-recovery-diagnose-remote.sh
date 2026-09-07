#!/usr/bin/env bash
# Диагностика recovery на VPS: логи auth + swaks на указанный email.
# Папка на Mac:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#   bash scripts/vps/run-recovery-diagnose-remote.sh chudinov92@gmail.com
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST="${VPS_HOST:-root@186.246.2.104}"
BODY="${ROOT}/scripts/vps/remote-recovery-diagnose.sh"
EMAIL="${1:-}"

if [[ -z "$EMAIL" ]]; then
  echo "Usage: $0 <email>"
  exit 1
fi

cd "$ROOT"

run_ssh() {
  ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "$HOST" "bash -s -- '${EMAIL}'" < "$BODY"
}

if [[ -n "${VPS_SSH_PASSWORD:-}" ]] && command -v expect >/dev/null 2>&1; then
  export VPS_SSH_PASSWORD
  expect "$ROOT/scripts/vps/ssh-with-password.expect" "$HOST" "$BODY" "$EMAIL"
elif [[ -n "${VPS_SSH_PASSWORD:-}" ]] && command -v sshpass >/dev/null 2>&1; then
  export SSHPASS="$VPS_SSH_PASSWORD"
  run_ssh
else
  echo "=== SSH to VPS (enter root password) ==="
  run_ssh
fi
