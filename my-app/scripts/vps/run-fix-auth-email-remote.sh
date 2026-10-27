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
BODY="${ROOT}/scripts/vps/remote-fix-auth-email.sh"
EXTRA_ARGS="${*:-}"

cd "$ROOT"

run_ssh() {
  if [[ -n "${EXTRA_ARGS}" ]]; then
    # shellcheck disable=SC2086
    ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "$HOST" "bash -s -- ${EXTRA_ARGS}" < "$BODY"
  else
    ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "$HOST" "bash -s" < "$BODY"
  fi
}

if [[ -n "${VPS_SSH_PASSWORD:-}" ]] && command -v expect >/dev/null 2>&1; then
  export VPS_SSH_PASSWORD
  # shellcheck disable=SC2086
  expect "$ROOT/scripts/vps/ssh-with-password.expect" "$HOST" "$BODY" ${EXTRA_ARGS}
elif [[ -n "${VPS_SSH_PASSWORD:-}" ]] && command -v sshpass >/dev/null 2>&1; then
  export SSHPASS="$VPS_SSH_PASSWORD"
  run_ssh
else
  echo "=== SSH to VPS (enter root password once) ==="
  run_ssh
fi
