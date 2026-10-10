#!/usr/bin/env bash
# Swaks с HTML, похожим на GoTrue recovery — проверка фильтра Yandex/Mail.ru.
# Папка на Mac:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#   bash scripts/vps/run-swaks-html-recovery-remote.sh v.chudinov.direct@yandex.ru
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST="${VPS_HOST:-root@186.246.2.104}"
EMAIL="${1:-}"

if [[ -z "$EMAIL" ]]; then
  echo "Usage: $0 <email>"
  exit 1
fi

cd "$ROOT"

run_ssh() {
  ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "$HOST" "bash -s -- '${EMAIL}'" \
    < "${ROOT}/scripts/vps/remote-swaks-html-recovery-body.sh"
}

echo "=== SSH to VPS (enter root password) ==="
run_ssh
