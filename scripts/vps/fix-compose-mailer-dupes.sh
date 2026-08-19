#!/usr/bin/env bash
# Починка дубликатов GOTRUE_MAILER_* в docker-compose.yml на VPS.
#
# cd /Users/vladimirchudinov/Desktop/my-startup/my-app
# bash scripts/vps/fix-compose-mailer-dupes.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST="${VPS_HOST:-root@186.246.2.104}"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15)

REMOTE='set -euo pipefail
cd /root/zeip/supabase-stack
cp docker-compose.yml "docker-compose.yml.bak.$(date +%s)"

python3 <<'"'"'PY'"'"'
from pathlib import Path
import re
import subprocess

path = Path("docker-compose.yml")
lines = path.read_text().splitlines(keepends=True)

mailer_keys = {
    "GOTRUE_MAILER_SUBJECTS_CONFIRMATION": "${MAILER_SUBJECTS_CONFIRMATION:-Подтвердите email — Zeip}",
    "GOTRUE_MAILER_TEMPLATES_CONFIRMATION": "${MAILER_TEMPLATES_CONFIRMATION:-http://templates-server/confirm.html}",
    "GOTRUE_MAILER_SUBJECTS_RECOVERY": "${MAILER_SUBJECTS_RECOVERY:-Сброс пароля — Zeip}",
    "GOTRUE_MAILER_TEMPLATES_RECOVERY": "${MAILER_TEMPLATES_RECOVERY:-http://templates-server/recovery.html}",
}

key_re = re.compile(
    r"^\s+(GOTRUE_MAILER_(?:SUBJECTS|TEMPLATES)_(?:CONFIRMATION|RECOVERY)):\s*"
)

removed = sum(1 for line in lines if key_re.match(line))
filtered = [line for line in lines if not key_re.match(line)]

needle = "GOTRUE_SMTP_ADMIN_EMAIL"
if not any(needle in line for line in filtered):
    needle = "GOTRUE_SITE_URL"
if not any(needle in line for line in filtered):
    raise SystemExit("anchor not found in docker-compose.yml")

block = [f"      {key}: {value}\n" for key, value in mailer_keys.items()]
out = []
inserted = False
for line in filtered:
    out.append(line)
    if not inserted and needle in line:
        out.extend(block)
        inserted = True

path.write_text("".join(out))
print(f"removed {removed} duplicate mailer line(s), inserted 4 canonical keys")
subprocess.run(["docker", "compose", "config", "-q"], check=True)
print("docker compose config OK")
PY

docker compose up -d --force-recreate --no-deps templates-server auth
docker compose restart kong
docker compose ps templates-server auth
'

run() {
  if [[ -n "${VPS_SSH_PASSWORD:-}" ]] && command -v sshpass >/dev/null 2>&1; then
    SSHPASS="$VPS_SSH_PASSWORD" sshpass -e ssh "${SSH_OPTS[@]}" "$HOST" bash -s <<< "$REMOTE"
  else
    echo "=== SSH (пароль root один раз) ==="
    ssh "${SSH_OPTS[@]}" "$HOST" bash -s <<< "$REMOTE"
  fi
}

run
echo "Done."
