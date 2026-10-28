#!/usr/bin/env bash
# Kong слушает HTTP на :8000 и HTTPS на :8443. Caddy уже терминирует TLS на :443,
# поэтому reverse_proxy должен идти на :8000 (plain HTTP), иначе Kong отвечает:
# "400 The plain HTTP request was sent to HTTPS port".
#
# Запуск на VPS:
#   bash /root/zeip/my-app/scripts/vps/fix-supabase-caddy-proxy.sh
set -euo pipefail

CADDYFILE="${CADDYFILE:-/etc/caddy/Caddyfile}"

if [[ ! -f "${CADDYFILE}" ]]; then
  echo "ОШИБКА: нет ${CADDYFILE}"
  exit 1
fi

if grep -q 'reverse_proxy 127.0.0.1:8443' "${CADDYFILE}"; then
  sed -i 's|reverse_proxy 127.0.0.1:8443|reverse_proxy 127.0.0.1:8000|g' "${CADDYFILE}"
  echo "Заменено 8443 → 8000 в ${CADDYFILE}"
else
  echo "8443 не найден — возможно, уже исправлено."
fi

caddy validate --config "${CADDYFILE}"
systemctl reload caddy
echo "Caddy перезагружен."

echo "Проверка REST:"
curl -sS -o /dev/null -w "HTTP %{http_code}\n" \
  -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY:-dummy}" \
  "https://supabase.zeip.ru/rest/v1/" || true

echo "Готово."
