#!/usr/bin/env bash
# С Mac: применить security headers в Caddy на VPS.
set -euo pipefail

VPS_HOST="${VPS_HOST:-root@186.246.2.104}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

ssh "$VPS_HOST" bash -s <<REMOTE
set -euo pipefail
cd /root/zeip/my-app
git pull --ff-only
bash scripts/vps/apply-caddy-security-headers.sh
REMOTE

echo "Done."
