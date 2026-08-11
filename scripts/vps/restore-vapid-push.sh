#!/usr/bin/env bash
# Восстановление Web Push (VAPID) на prod после деплоя без NEXT_PUBLIC_VAPID_PUBLIC_KEY.
# Запуск на VPS:
#   bash /root/zeip/my-app/scripts/vps/restore-vapid-push.sh
set -euo pipefail

ROOT="/root/zeip/my-app"
ENV_FILE="${ROOT}/deploy/timeweb/.env.app"
BACKUP="${ROOT}/deploy/timeweb/.env.app.freemium.bak"

cd "${ROOT}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ОШИБКА: нет ${ENV_FILE}"
  exit 1
fi

has_vapid() {
  grep -q '^NEXT_PUBLIC_VAPID_PUBLIC_KEY=' "${ENV_FILE}" && \
    grep -q '^VAPID_PRIVATE_KEY=' "${ENV_FILE}" && \
    grep -q '^VAPID_SUBJECT=' "${ENV_FILE}"
}

if has_vapid; then
  echo "VAPID уже есть в ${ENV_FILE} — нужна только пересборка app-web"
else
  if [[ -f "${BACKUP}" ]]; then
    echo "=== копируем VAPID из ${BACKUP} ==="
    for key in NEXT_PUBLIC_VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_SUBJECT INTERNAL_PUSH_SECRET; do
      line="$(grep -E "^${key}=" "${BACKUP}" || true)"
      if [[ -n "${line}" ]]; then
        grep -v "^${key}=" "${ENV_FILE}" > "${ENV_FILE}.tmp" || true
        mv "${ENV_FILE}.tmp" "${ENV_FILE}"
        echo "${line}" >> "${ENV_FILE}"
        echo "  + ${key}"
      fi
    done
  fi

  if ! has_vapid; then
    echo "ОШИБКА: VAPID не найден ни в .env.app, ни в .env.app.freemium.bak"
    echo "Сгенерируйте ключи локально:"
    echo "  cd /Users/vladimirchudinov/Desktop/my-startup/my-app"
    echo "  npx web-push generate-vapid-keys"
    echo "Добавьте в ${ENV_FILE}:"
    echo "  NEXT_PUBLIC_VAPID_PUBLIC_KEY=..."
    echo "  VAPID_PRIVATE_KEY=..."
    echo "  VAPID_SUBJECT=mailto:admin@zeip.ru"
    exit 1
  fi
fi

echo "=== пересборка app-web (NEXT_PUBLIC_* вшивается в build) ==="
bash "${ROOT}/deploy/timeweb/deploy-app.sh"

echo "=== готово: проверьте «Включить уведомления» на https://zeip.ru ==="
