#!/usr/bin/env bash
# С Mac: DNS-проверка + применение HELO hostname на VPS (SSH, inline — git pull не нужен).
#
# Папка:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#   bash scripts/vps/run-set-mail-helo-remote.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST="${VPS_HOST:-root@186.246.2.104}"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15)
BODY="${ROOT}/scripts/vps/remote-set-mail-helo-body.sh"

echo "=== 1/3 Local DNS check ==="
bash "${ROOT}/scripts/vps/verify-mail-helo-dns.sh" || {
  echo ""
  echo "Сначала настройте A + PTR в Timeweb, затем повторите."
  exit 1
}

run_ssh() {
  if [[ -n "${VPS_SSH_PASSWORD:-}" ]] && command -v sshpass >/dev/null 2>&1; then
    SSHPASS="$VPS_SSH_PASSWORD" sshpass -e ssh "${SSH_OPTS[@]}" "$HOST" "bash -s" < "$BODY"
  else
    echo "=== SSH (пароль root один раз) ==="
    ssh "${SSH_OPTS[@]}" "$HOST" "bash -s" < "$BODY"
  fi
}

echo ""
echo "=== 2/3 Apply on VPS (inline) ==="
run_ssh

echo ""
echo "=== 3/3 Post-check DNS ==="
bash "${ROOT}/scripts/vps/verify-mail-helo-dns.sh"
echo "Done."
