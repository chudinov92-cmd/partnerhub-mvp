#!/usr/bin/env bash
# Проверка DNS для доставляемости auth-писем zeip.ru (SPF, DKIM, DMARC, MX).
# Папка:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#   bash scripts/check-email-dns.sh
#
set -euo pipefail

DOMAIN="${1:-zeip.ru}"

check_txt() {
  local name="$1"
  local label="$2"
  echo "=== ${label} (${name}) ==="
  local out
  out="$(dig +short TXT "$name" 2>/dev/null | tr -d '"' || true)"
  if [[ -z "$out" ]]; then
    echo "MISSING or empty"
    return 1
  fi
  echo "$out"
  return 0
}

echo "Email DNS check for ${DOMAIN}"
echo ""

ok=0
fail=0

if check_txt "$DOMAIN" "SPF"; then
  if grep -q 'spf1' <<< "$(dig +short TXT "$DOMAIN")"; then ok=$((ok + 1)); else fail=$((fail + 1)); fi
else fail=$((fail + 1)); fi

echo ""
if check_txt "_dmarc.${DOMAIN}" "DMARC"; then ok=$((ok + 1)); else fail=$((fail + 1)); fi

echo ""
# Timeweb: selector dkim._domainkey (проверено для zeip.ru)
dkim_found=0
for sel in "dkim._domainkey" "mail._domainkey" "default._domainkey" "timeweb._domainkey" "_domainkey"; do
  for resolver in "" "@8.8.8.8"; do
    if out="$(dig +short TXT "${sel}.${DOMAIN}" ${resolver} 2>/dev/null)" && [[ -n "$out" ]]; then
      echo "=== DKIM (${sel}.${DOMAIN}${resolver:+ via ${resolver#@}}) ==="
      echo "$out" | tr -d '"'
      dkim_found=1
      ok=$((ok + 1))
      break 2
    fi
  done
done
if [[ "$dkim_found" -eq 0 ]]; then
  echo "=== DKIM ==="
  echo "MISSING — добавьте DKIM в панели Timeweb для почты ${DOMAIN}"
  fail=$((fail + 1))
fi

echo ""
echo "=== MX ==="
dig +short MX "$DOMAIN" 2>/dev/null || echo "MISSING"

echo ""
echo "--- Summary ---"
echo "OK checks: ${ok}, issues: ${fail}"
if dig +short TXT "_dmarc.${DOMAIN}" 2>/dev/null | grep -q 'p=none'; then
  echo "Note: DMARC p=none — для репутации со временем перейти на p=quarantine (после стабильного DKIM)."
fi
if dig +short TXT "$DOMAIN" 2>/dev/null | grep -q '~all'; then
  echo "Note: SPF ~all (softfail) — Timeweb обычно так; при проблемах уточните в поддержке Timeweb."
fi
