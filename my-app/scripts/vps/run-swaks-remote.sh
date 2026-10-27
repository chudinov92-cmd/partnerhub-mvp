#!/usr/bin/env bash
# Запуск swaks на VPS в фоне + чтение лога (2 SSH, SSH не обрывается на SMTP).
#
# Папка на Mac:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#   bash scripts/vps/run-swaks-remote.sh test@gmail.com
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST="${VPS_HOST:-root@186.246.2.104}"
TEST_TO="${1:-test@gmail.com}"
WAIT="${SWAKS_WAIT_SEC:-25}"

cd "$ROOT"

echo "=== 1/2 Start swaks on VPS (background) ==="
ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "$HOST" bash -s <<REMOTE
set -euo pipefail
cd /root/zeip/my-app
git pull --ff-only
nohup bash scripts/vps/run-swaks-on-vps.sh '${TEST_TO}' > /tmp/zeip-swaks-runner.log 2>&1 &
echo "swaks background pid=\$!"
echo "Wait ${WAIT}s then read logs..."
REMOTE

echo "=== waiting ${WAIT}s ==="
sleep "$WAIT"

echo "=== 2/2 Logs from VPS ==="
ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "$HOST" bash -s <<'REMOTE'
echo "--- /tmp/zeip-swaks-latest.log ---"
cat /tmp/zeip-swaks-latest.log 2>/dev/null || echo "(empty)"
echo ""
echo "--- /tmp/zeip-swaks-runner.log ---"
cat /tmp/zeip-swaks-runner.log 2>/dev/null || echo "(empty)"
REMOTE
