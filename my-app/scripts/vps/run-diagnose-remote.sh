#!/usr/bin/env bash
# Диагностика диска VPS с Mac.
# Папка:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#   bash scripts/vps/run-diagnose-remote.sh
#
# С паролем:
#   VPS_SSH_PASSWORD='***' bash scripts/vps/run-diagnose-remote.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST="${VPS_HOST:-root@186.246.2.104}"
MAINT="${ROOT}/scripts/migration/timeweb_disk_maintenance.sh"

cd "$ROOT"

if [[ -n "${VPS_SSH_PASSWORD:-}" ]] && command -v expect >/dev/null 2>&1; then
  export VPS_SSH_PASSWORD
  expect "$ROOT/scripts/vps/ssh-with-password.expect" "$HOST" "$MAINT" diagnose
else
  ssh -o StrictHostKeyChecking=accept-new "$HOST" 'bash -s diagnose' < "$MAINT"
fi
