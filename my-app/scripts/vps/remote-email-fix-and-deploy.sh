#!/usr/bin/env bash
# Тело для запуска НА VPS (через ssh bash -s с Mac).
# Папка на Mac:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#   bash scripts/vps/run-email-fix-and-deploy-remote.sh
#
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
  echo "ERROR: git-репозиторий Zeip не найден на VPS."
  echo "Проверьте /root/zeip/my-app или /root/zeip/app (нужна папка .git)."
  exit 1
fi

echo "=== App dir: ${APP} ==="
cd "$APP"

echo "=== git pull ==="
git pull --ff-only

echo "=== fix-auth-email-on-vps ==="
# shellcheck disable=SC2086
bash scripts/vps/fix-auth-email-on-vps.sh ${EXTRA_ARGS}

echo "=== deploy-app ==="
bash deploy/timeweb/deploy-app.sh

echo "=== diagnose auth email ==="
bash scripts/vps/diagnose-auth-email.sh test@gmail.com
