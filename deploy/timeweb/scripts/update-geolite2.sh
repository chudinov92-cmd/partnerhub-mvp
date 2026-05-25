#!/usr/bin/env bash
# Скачивает/обновляет GeoLite2-City.mmdb для IP-геолокации на VPS.
# Запуск (на VPS):
#   cd /root/zeip/my-app
#   bash deploy/timeweb/scripts/update-geolite2.sh
#
# Требует в deploy/timeweb/.env.app (или env):
#   MAXMIND_ACCOUNT_ID=...
#   MAXMIND_LICENSE_KEY=...
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT}/deploy/timeweb/.env.app"
GEOIP_DIR="${GEOIP_DIR:-/root/zeip/geoip}"
TARGET="${GEOIP_DIR}/GeoLite2-City.mmdb"
TMP_DIR="${GEOIP_DIR}/.tmp"

if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "${ENV_FILE}"
  set +a
fi

: "${MAXMIND_ACCOUNT_ID:?MAXMIND_ACCOUNT_ID не задан (deploy/timeweb/.env.app)}"
: "${MAXMIND_LICENSE_KEY:?MAXMIND_LICENSE_KEY не задан (deploy/timeweb/.env.app)}"

mkdir -p "${GEOIP_DIR}" "${TMP_DIR}"

ARCHIVE="${TMP_DIR}/GeoLite2-City.tar.gz"
URL="https://download.maxmind.com/geoip/databases/GeoLite2-City/download?suffix=tar.gz"

echo "=== download GeoLite2-City ==="
curl -fsSL -u "${MAXMIND_ACCOUNT_ID}:${MAXMIND_LICENSE_KEY}" \
  "${URL}" \
  -o "${ARCHIVE}"

echo "=== extract ==="
tar -xzf "${ARCHIVE}" -C "${TMP_DIR}"

MMDB_SRC="$(find "${TMP_DIR}" -name 'GeoLite2-City.mmdb' -print -quit)"
if [[ -z "${MMDB_SRC}" || ! -f "${MMDB_SRC}" ]]; then
  echo "ОШИБКА: GeoLite2-City.mmdb не найден в архиве"
  exit 1
fi

mv -f "${MMDB_SRC}" "${TARGET}"
rm -rf "${TMP_DIR}"

echo "=== OK: ${TARGET} ($(du -h "${TARGET}" | awk '{print $1}'))"
