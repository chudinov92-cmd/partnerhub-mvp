#!/usr/bin/env bash
# Запуск enable-parallel-test-domain.sh на VPS с Mac.
set -euo pipefail

VPS_HOST="${VPS_HOST:-root@186.246.2.104}"
REMOTE_DIR="${REMOTE_DIR:-/root/zeip/my-app}"

echo "=== SSH ${VPS_HOST} ==="
ssh "${VPS_HOST}" "cd ${REMOTE_DIR} && git fetch origin && git checkout paid-access && git pull --ff-only && bash scripts/vps/enable-parallel-test-domain.sh"
