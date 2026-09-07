#!/usr/bin/env bash
# Тело для fix-auth-email на VPS (через ssh bash -s с Mac).
set -euo pipefail

EXTRA_ARGS="${*:-}"

APP=""
for d in /root/zeip/my-app /root/zeip/app; do
  if [[ -d "$d/.git" ]]; then
    APP="$d"
    break
  fi
done

if [[ -z "$APP" ]]; then
  echo "ERROR: git-репозиторий Zeip не найден на VPS (/root/zeip/my-app, /root/zeip/app)."
  exit 1
fi

echo "=== App dir: ${APP} ==="
cd "$APP"
git pull --ff-only
# shellcheck disable=SC2086
bash scripts/vps/fix-auth-email-on-vps.sh ${EXTRA_ARGS}
bash scripts/vps/diagnose-auth-email.sh test@gmail.com
