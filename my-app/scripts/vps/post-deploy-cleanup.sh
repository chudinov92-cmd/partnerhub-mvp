#!/usr/bin/env bash
# Чистка VPS после деплоя: Docker + архив старых SQL в docs/
# Запуск на VPS:
#   ssh root@186.246.2.104
#   cd /root/zeip/my-app && bash scripts/vps/post-deploy-cleanup.sh
set -euo pipefail

ROOT="/root/zeip/my-app"
cd "${ROOT}"

echo "=== Docker prune (безопасно после успешного деплоя) ==="
docker container prune -f
docker image prune -f
docker image prune -af
docker volume prune -f
df -h /

echo "=== SQL archive ==="
mkdir -p docs/archive
if compgen -G "docs/*.sql" > /dev/null; then
  mv docs/*.sql docs/archive/
  echo "Перенесены SQL в docs/archive/"
else
  echo "docs/*.sql уже пуст — пропуск"
fi

echo "=== Готово ==="
