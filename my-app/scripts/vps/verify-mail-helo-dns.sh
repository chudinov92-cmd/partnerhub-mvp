#!/usr/bin/env bash
# Проверка DNS для HELO mail.zeip.ru (A + PTR). Инструкции для панели Timeweb при FAIL.
#
# Папка:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#   bash scripts/vps/verify-mail-helo-dns.sh
#
set -euo pipefail

MAIL_HOST="${MAIL_HELO:-mail.zeip.ru}"
VPS_IP="${VPS_IP:-186.246.2.104}"
DOMAIN="${MAIL_DOMAIN:-zeip.ru}"

fail=0

echo "=== HELO DNS check: ${MAIL_HOST} / ${VPS_IP} ==="
echo ""

echo "=== A ${MAIL_HOST} ==="
A_RECORD="$(dig +short A "${MAIL_HOST}" 2>/dev/null | head -1 || true)"
if [[ -z "$A_RECORD" ]]; then
  echo "MISSING — добавьте в Timeweb → Домены → ${DOMAIN} → DNS:"
  echo "  Тип: A | Имя: mail | Значение: ${VPS_IP}"
  fail=$((fail + 1))
elif [[ "$A_RECORD" != "$VPS_IP" ]]; then
  echo "MISMATCH: ${A_RECORD} (ожидалось ${VPS_IP})"
  fail=$((fail + 1))
else
  echo "OK: ${A_RECORD}"
fi

echo ""
echo "=== PTR ${VPS_IP} ==="
PTR_RECORD="$(dig +short -x "${VPS_IP}" 2>/dev/null | sed 's/\.$//' | head -1 || true)"
if [[ -z "$PTR_RECORD" ]]; then
  echo "MISSING — в Timeweb → Серверы → VPS → Сеть / Обратная зона:"
  echo "  PTR для ${VPS_IP} → ${MAIL_HOST}"
  echo "  (или тикет в поддержку: «PTR ${VPS_IP} → ${MAIL_HOST}»)"
  fail=$((fail + 1))
elif [[ "$PTR_RECORD" != "$MAIL_HOST" && "$PTR_RECORD" != "${MAIL_HOST}." ]]; then
  echo "MISMATCH: ${PTR_RECORD} (ожидалось ${MAIL_HOST})"
  fail=$((fail + 1))
else
  echo "OK: ${PTR_RECORD}"
fi

echo ""
echo "=== Forward/Reverse match ==="
if [[ -n "$A_RECORD" && -n "$PTR_RECORD" ]]; then
  FWD="$(dig +short A "${MAIL_HOST}" 2>/dev/null | head -1 || true)"
  REV="$(dig +short -x "${FWD}" 2>/dev/null | sed 's/\.$//' | head -1 || true)"
  if [[ "$REV" == "$MAIL_HOST" ]]; then
    echo "OK: A/PTR согласованы"
  else
    echo "WARN: A→PTR не совпадает (${FWD} → ${REV:-empty})"
  fi
fi

echo ""
echo "--- Summary ---"
if [[ "$fail" -eq 0 ]]; then
  echo "HELO DNS: OK — можно менять hostname VPS и EHLO клиентов"
  exit 0
fi

echo "HELO DNS: ${fail} issue(s) — сначала настройте DNS в Timeweb, затем:"
echo "  ssh root@${VPS_IP}"
echo "  cd /root/zeip/my-app && bash scripts/vps/set-mail-helo-hostname.sh"
exit 1
