#!/usr/bin/env bash
# Тело для диагностики recovery на VPS (ssh bash -s).
set -euo pipefail

EMAIL="${1:-}"
if [[ -z "$EMAIL" ]]; then
  echo "ERROR: email required"
  exit 1
fi

STACK="/root/zeip/supabase-stack"
APP="/root/zeip/my-app"
[[ -d "$APP/.git" ]] || APP="/root/zeip/app"

echo "=== Auth logs (15m, mail/recovery/errors) ==="
cd "$STACK"
docker compose logs auth --since 15m 2>/dev/null \
  | grep -iE 'recovery|/recover|mail|smtp|template|error|550|554|535|failed|sent' \
  | tail -80 || echo "(no matching log lines)"

echo ""
echo "=== swaks → ${EMAIL} ==="
bash "$APP/scripts/vps/run-swaks-on-vps.sh" "$EMAIL"
sleep 5
echo "--- /tmp/zeip-swaks-latest.log ---"
cat /tmp/zeip-swaks-latest.log 2>/dev/null || echo "(empty)"

if grep -q '250 ' /tmp/zeip-swaks-latest.log 2>/dev/null; then
  echo "swaks: 250 OK"
else
  echo "swaks: FAIL or incomplete — see log above"
fi
