#!/usr/bin/env bash
# С Mac: синхронизация SMTP в .env.app и recreate app-web на VPS.
# Папка:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#   bash scripts/vps/run-sync-smtp-remote.sh
# С паролем:
#   VPS_SSH_PASSWORD='***' bash scripts/vps/run-sync-smtp-remote.sh
# Без git pull (если скрипт ещё не на сервере):
#   VPS_SSH_PASSWORD='***' bash scripts/vps/run-sync-smtp-remote.sh --inline
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST="${VPS_HOST:-root@186.246.2.104}"
INLINE=0

for arg in "$@"; do
  case "$arg" in
    --inline) INLINE=1 ;;
  esac
done

if [[ "$INLINE" -eq 1 ]]; then
  BODY="${ROOT}/scripts/vps/remote-sync-smtp-body.sh"
else
  REMOTE="cd /root/zeip/my-app && git pull --ff-only && bash scripts/vps/sync-smtp-to-env-app.sh --recreate"
fi

cd "$ROOT"

run_ssh() {
  if [[ "$INLINE" -eq 1 ]]; then
    ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "$HOST" "bash -s" < "$BODY"
  else
    ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "$HOST" "$REMOTE"
  fi
}

if [[ -n "${VPS_SSH_PASSWORD:-}" ]] && command -v sshpass >/dev/null 2>&1; then
  export SSHPASS="$VPS_SSH_PASSWORD"
  if [[ "$INLINE" -eq 1 ]]; then
    sshpass -e ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "$HOST" "bash -s" < "$BODY"
  else
    sshpass -e ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "$HOST" "$REMOTE"
  fi
elif [[ -n "${VPS_SSH_PASSWORD:-}" ]] && command -v expect >/dev/null 2>&1; then
  export VPS_SSH_PASSWORD
  if [[ "$INLINE" -eq 1 ]]; then
    expect "$ROOT/scripts/vps/ssh-with-password.expect" "$HOST" bash -s < "$BODY"
  else
    expect "$ROOT/scripts/vps/ssh-with-password.expect" "$HOST" "$REMOTE"
  fi
else
  run_ssh
fi
