#!/usr/bin/env bash
# Меняет hostname VPS на mail.zeip.ru для корректного HELO при SMTP через Timeweb.
# НЕ мапит apex zeip.ru на loopback (hairpin для Caddy/pg_net).
#
# Перед запуском: bash scripts/vps/verify-mail-helo-dns.sh (A + PTR в Timeweb).
#
# На VPS:
#   cd /root/zeip/my-app
#   bash scripts/vps/set-mail-helo-hostname.sh
#
set -euo pipefail

MAIL_HELO="${MAIL_HELO:-mail.zeip.ru}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="${APP_DIR:-/root/zeip/my-app}"

echo "=== Set VPS hostname → ${MAIL_HELO} ==="

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Error: run as root on VPS"
  exit 1
fi

cp /etc/hosts "/etc/hosts.bak.$(date +%s)"

hostnamectl set-hostname "$MAIL_HELO"

python3 <<PY
from pathlib import Path
import re

mail_helo = "${MAIL_HELO}"
path = Path("/etc/hosts")
lines = path.read_text().splitlines()

out = []
seen_mail_helo = False

for line in lines:
    stripped = line.strip()
    if not stripped or stripped.startswith("#"):
        out.append(line)
        continue

    parts = stripped.split()
    if len(parts) >= 2 and parts[0] in ("127.0.0.1", "127.0.1.1"):
        names = parts[1:]
        # Убрать apex zeip.ru с loopback — ломает hairpin curl https://zeip.ru
        names = [n for n in names if n not in ("zeip.ru", "www.zeip.ru")]
        if parts[0] == "127.0.1.1":
            if mail_helo not in names:
                names.append(mail_helo)
            seen_mail_helo = True
            if names:
                out.append(f"{parts[0]}\t{' '.join(names)}")
            continue
        if names:
            out.append(f"{parts[0]}\t{' '.join(names)}")
        continue

    out.append(line)

if not seen_mail_helo:
    out.append(f"127.0.1.1\t{mail_helo}")

path.write_text("\n".join(out) + "\n")
print("/etc/hosts updated")
PY

echo ""
echo "=== hostname -f ==="
hostname -f
hostnamectl status | grep -E 'Static hostname|Transient hostname' || true

echo ""
echo "=== /etc/hosts (zeip) ==="
grep -E 'zeip|127\.0\.1\.1' /etc/hosts || true

echo ""
echo "=== Patch supabase-auth container hostname ==="
bash "${SCRIPT_DIR}/patch-compose-auth-helo.sh"

echo ""
echo "=== Recreate app-web (docker hostname + SMTP_HELO_NAME) ==="
if [[ -f "${APP_DIR}/scripts/vps/sync-smtp-to-env-app.sh" ]]; then
  bash "${APP_DIR}/scripts/vps/sync-smtp-to-env-app.sh" --recreate
else
  echo "WARN: sync-smtp-to-env-app.sh not found — recreate app-web manually"
fi

echo ""
echo "Done. Проверка HELO:"
echo "  bash ${APP_DIR}/scripts/vps/run-swaks-on-vps.sh test@mail-tester.com"
echo "  (в логе Timeweb должно быть H=(${MAIL_HELO}), не twc1.net)"
