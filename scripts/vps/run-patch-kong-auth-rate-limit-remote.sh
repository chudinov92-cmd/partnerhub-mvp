#!/usr/bin/env bash
# С Mac: патч kong.yml + restart Kong на VPS.
set -euo pipefail

VPS_HOST="${VPS_HOST:-root@186.246.2.104}"

ssh "$VPS_HOST" bash -s <<'REMOTE'
set -euo pipefail
cd /root/zeip/my-app
git pull --ff-only
bash scripts/vps/patch-kong-auth-rate-limit.sh
REMOTE

echo "Done."
