#!/usr/bin/env bash
# Тело для run-migrate-prod-domain-remote.sh (expect читает файл и шлёт на VPS через bash -s).
set -euo pipefail
cd /root/zeip/my-app
git pull --ff-only
bash scripts/vps/migrate-to-prod-domain.sh
bash deploy/timeweb/deploy-app.sh
