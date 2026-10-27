#!/usr/bin/env bash
# Патч OTP-only env на VPS без git pull (inline с Mac).
# Папка:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#   bash scripts/vps/run-fix-auth-email-otp-inline-remote.sh
set -euo pipefail

HOST="${VPS_HOST:-root@186.246.2.104}"

echo "=== SSH: patch OTP mailer env + recreate auth (inline) ==="
ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "$HOST" 'bash -s' <<'REMOTE'
set -euo pipefail
STACK=/root/zeip/supabase-stack
cd "$STACK"

ensure_env_kv() {
  local key="$1"
  local value="$2"
  grep -v "^${key}=" .env > .env.tmp 2>/dev/null || true
  mv .env.tmp .env
  echo "${key}=${value}" >> .env
}

echo "=== Patch .env (OTP subjects + exp) ==="
ensure_env_kv "MAILER_SUBJECTS_CONFIRMATION" "Код подтверждения — Zeip"
ensure_env_kv "MAILER_TEMPLATES_CONFIRMATION" "http://templates-server/confirm.html"
ensure_env_kv "MAILER_SUBJECTS_RECOVERY" "Код для сброса пароля — Zeip"
ensure_env_kv "MAILER_TEMPLATES_RECOVERY" "http://templates-server/recovery.html"
ensure_env_kv "MAILER_OTP_EXP" "600"
ensure_env_kv "GOTRUE_MAILER_OTP_EXP" "600"
ensure_env_kv "GOTRUE_MAILER_EXTERNAL_HOSTS" "supabase.zeip.ru"

grep -E '^MAILER_|^GOTRUE_MAILER_OTP_EXP|^GOTRUE_MAILER_EXTERNAL' .env || true

echo "=== Patch docker-compose.yml mailer keys ==="
python3 <<'PY'
from pathlib import Path
import re
import subprocess

path = Path("docker-compose.yml")
lines = path.read_text().splitlines(keepends=True)

mailer_keys = {
    "GOTRUE_MAILER_SUBJECTS_CONFIRMATION": "${MAILER_SUBJECTS_CONFIRMATION:-Код подтверждения — Zeip}",
    "GOTRUE_MAILER_TEMPLATES_CONFIRMATION": "${MAILER_TEMPLATES_CONFIRMATION:-http://templates-server/confirm.html}",
    "GOTRUE_MAILER_SUBJECTS_RECOVERY": "${MAILER_SUBJECTS_RECOVERY:-Код для сброса пароля — Zeip}",
    "GOTRUE_MAILER_TEMPLATES_RECOVERY": "${MAILER_TEMPLATES_RECOVERY:-http://templates-server/recovery.html}",
    "GOTRUE_MAILER_OTP_EXP": "${GOTRUE_MAILER_OTP_EXP:-600}",
}

key_re = re.compile(
    r"^\s+(GOTRUE_MAILER_(?:SUBJECTS|TEMPLATES)_(?:CONFIRMATION|RECOVERY)|GOTRUE_MAILER_OTP_EXP):\s*"
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
print(f"removed {removed} duplicate mailer line(s), inserted 5 canonical keys")
subprocess.run(["docker", "compose", "config", "-q"], check=True)
PY

echo "=== Recreate auth ==="
docker compose up -d --force-recreate --no-deps auth
docker compose restart kong
sleep 3

echo "=== Auth mailer env (expect OTP_EXP=600) ==="
docker inspect supabase-auth --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -E 'GOTRUE_MAILER_OTP_EXP|GOTRUE_MAILER_SUBJECTS' || true
REMOTE

echo "Done."
