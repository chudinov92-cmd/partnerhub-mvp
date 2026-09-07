#!/usr/bin/env bash
# Починка auth-писем на VPS: templates-server + env + recreate auth
# Запускать НА VPS (не с Mac):
#   cd /root/zeip/my-app
#   bash scripts/vps/fix-auth-email-on-vps.sh
#   bash scripts/vps/fix-auth-email-on-vps.sh --smtp-587
#
set -euo pipefail

STACK_DIR="${STACK_DIR:-/root/zeip/supabase-stack}"
APP_DIR="${APP_DIR:-}"
if [[ -z "$APP_DIR" ]]; then
  for d in /root/zeip/my-app /root/zeip/app; do
    if [[ -d "$d/.git" ]] || [[ -d "$d/deploy/timeweb/supabase/email-templates" ]]; then
      APP_DIR="$d"
      break
    fi
  done
  APP_DIR="${APP_DIR:-/root/zeip/my-app}"
fi
TEMPLATES_SRC="${APP_DIR}/deploy/timeweb/supabase/email-templates"
USE_587=0

for arg in "$@"; do
  case "$arg" in
    --smtp-587) USE_587=1 ;;
  esac
done

if [[ ! -d "$STACK_DIR" ]]; then
  echo "Error: $STACK_DIR not found"
  exit 1
fi

cd "$STACK_DIR"

echo "=== Copy email templates ==="
mkdir -p volumes/templates
cp "${TEMPLATES_SRC}/confirm.html" volumes/templates/
cp "${TEMPLATES_SRC}/recovery.html" volumes/templates/
ls -la volumes/templates/

ensure_env_kv() {
  local key="$1"
  local value="$2"
  # Remove all duplicates, keep single canonical line
  grep -v "^${key}=" .env > .env.tmp 2>/dev/null || true
  mv .env.tmp .env
  echo "${key}=${value}" >> .env
}

echo "=== Patch .env (mailer + external hosts) ==="
ensure_env_kv "MAILER_SUBJECTS_CONFIRMATION" "Подтвердите email — Zeip"
ensure_env_kv "MAILER_TEMPLATES_CONFIRMATION" "http://templates-server/confirm.html"
ensure_env_kv "MAILER_SUBJECTS_RECOVERY" "Сброс пароля — Zeip"
ensure_env_kv "MAILER_TEMPLATES_RECOVERY" "http://templates-server/recovery.html"
ensure_env_kv "GOTRUE_MAILER_EXTERNAL_HOSTS" "supabase.zeip.ru"

# Mirror SMTP_* → GOTRUE_SMTP_* in .env (grep + set -e safe for other scripts)
for pair in \
  "SMTP_HOST:GOTRUE_SMTP_HOST" \
  "SMTP_PORT:GOTRUE_SMTP_PORT" \
  "SMTP_USER:GOTRUE_SMTP_USER" \
  "SMTP_PASS:GOTRUE_SMTP_PASS" \
  "SMTP_ADMIN_EMAIL:GOTRUE_SMTP_ADMIN_EMAIL" \
  "SMTP_SENDER_NAME:GOTRUE_SMTP_SENDER_NAME"; do
  src="${pair%%:*}"
  dst="${pair##*:}"
  val="$(grep "^${src}=" .env 2>/dev/null | head -1 | cut -d= -f2- || true)"
  if [[ -n "$val" ]]; then
    ensure_env_kv "$dst" "$val"
  fi
done

if [[ "$USE_587" -eq 1 ]]; then
  echo "=== Switch SMTP to port 587 (STARTTLS) ==="
  ensure_env_kv "SMTP_PORT" "587"
  ensure_env_kv "GOTRUE_SMTP_PORT" "587"
fi

grep -E '^MAILER_|^GOTRUE_MAILER_EXTERNAL|^SMTP_PORT|^GOTRUE_SMTP_PORT' .env || true

echo "=== Ensure templates-server in docker-compose.yml ==="
if ! grep -q "templates-server:" docker-compose.yml 2>/dev/null; then
  python3 <<'PY'
from pathlib import Path

path = Path("docker-compose.yml")
text = path.read_text()
if "templates-server:" in text:
    raise SystemExit(0)

block = """
  templates-server:
    image: caddy:2-alpine
    command: ["caddy", "file-server", "-r", "/templates", "--listen", ":80"]
    volumes:
      - ./volumes/templates:/templates
"""

text = text.replace("services:\n", "services:\n" + block, 1)
path.write_text(text)
print("templates-server service added")
PY
fi

echo "=== Patch mailer keys in docker-compose.yml (dedupe) ==="
python3 <<'PY'
from pathlib import Path
import re
import subprocess

path = Path("docker-compose.yml")
if not path.exists():
    raise SystemExit("docker-compose.yml not found")

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
    print("skip compose mailer patch: anchor not found")
    raise SystemExit(0)

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

echo "=== Recreate templates-server + auth ==="
docker compose config -q
docker compose up -d --force-recreate --no-deps templates-server auth
docker compose restart kong

echo "=== Verify templates from auth network ==="
sleep 3
docker run --rm --network "container:supabase-auth" curlimages/curl:8.5.0 \
  -sf --max-time 8 http://templates-server/recovery.html | head -3 \
  || echo "WARN: auth network cannot reach templates-server — check docker compose networks"

echo ""
echo "=== Auth mailer env ==="
docker inspect supabase-auth --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -E 'GOTRUE_MAILER|GOTRUE_SMTP|EXTERNAL_HOSTS' | grep -v PASS || true

echo ""
echo "Done. Run diagnose:"
echo "  bash ${APP_DIR}/scripts/vps/diagnose-auth-email.sh test@gmail.com"
