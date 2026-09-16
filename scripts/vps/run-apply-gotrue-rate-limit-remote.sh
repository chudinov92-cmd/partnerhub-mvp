#!/usr/bin/env bash
# С Mac: применить GoTrue/Kong rate limits на VPS.
set -euo pipefail

VPS_HOST="${VPS_HOST:-root@186.246.2.104}"

ssh "$VPS_HOST" bash -s <<'REMOTE'
set -euo pipefail
cd /root/zeip/my-app
git pull --ff-only
bash scripts/vps/apply-gotrue-rate-limit.sh
REMOTE

echo "Done."
