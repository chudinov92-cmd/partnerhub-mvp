#!/usr/bin/env bash
# Caddy + GoTrue + push_dispatch_url на VPS (возврат на zeip.ru).
# Папка:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#
# Интерактивный SSH:
#   bash scripts/vps/run-migrate-prod-domain-remote.sh
#
# С паролем:
#   VPS_SSH_PASSWORD='***' bash scripts/vps/run-migrate-prod-domain-remote.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST="${VPS_HOST:-root@186.246.2.104}"
REMOTE="cd /root/zeip/my-app && git pull --ff-only && bash scripts/vps/migrate-to-prod-domain.sh && bash deploy/timeweb/deploy-app.sh"

cd "$ROOT"

if [[ -n "${VPS_SSH_PASSWORD:-}" ]] && command -v sshpass >/dev/null 2>&1; then
  export SSHPASS="$VPS_SSH_PASSWORD"
  sshpass -e ssh -o StrictHostKeyChecking=accept-new "$HOST" "$REMOTE"
elif [[ -n "${VPS_SSH_PASSWORD:-}" ]] && command -v expect >/dev/null 2>&1; then
  export VPS_SSH_PASSWORD
  expect -f - <<EXPECT
set timeout 1800
spawn ssh -o StrictHostKeyChecking=accept-new "$HOST" "$REMOTE"
expect {
  -re "(?i)password:" {
    send "\$env(VPS_SSH_PASSWORD)\r"
    exp_continue
  }
  eof {}
}
EXPECT
else
  ssh -o StrictHostKeyChecking=accept-new "$HOST" "$REMOTE"
fi
