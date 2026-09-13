#!/usr/bin/env bash
# Inline body для run-set-mail-helo-remote.sh — не требует git pull на VPS.
set -euo pipefail

MAIL_HELO="${MAIL_HELO:-mail.zeip.ru}"
STACK_DIR="${STACK_DIR:-/root/zeip/supabase-stack}"
APP_DIR="${APP_DIR:-/root/zeip/my-app}"
APP_ENV="${APP_DIR}/deploy/timeweb/.env.app"
APP_COMPOSE="${APP_DIR}/deploy/timeweb/docker-compose.app.yml"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Error: run as root on VPS"
  exit 1
fi

echo "=== Set VPS hostname → ${MAIL_HELO} ==="
cp /etc/hosts "/etc/hosts.bak.$(date +%s)"
hostnamectl set-hostname "$MAIL_HELO"

python3 <<PY
from pathlib import Path

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
        names = [n for n in parts[1:] if n not in ("zeip.ru", "www.zeip.ru")]
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
grep -E 'zeip|127\.0\.1\.1' /etc/hosts || true

echo ""
echo "=== Patch supabase-auth container hostname ==="
cd "$STACK_DIR"
cp docker-compose.yml "docker-compose.yml.bak.helo.$(date +%s)"

python3 <<PY
from pathlib import Path
import re
import subprocess

mail_helo = "${MAIL_HELO}"
path = Path("docker-compose.yml")
lines = path.read_text().splitlines(keepends=True)
auth_start = auth_end = None

for i, line in enumerate(lines):
    if re.match(r"^  auth:\s*$", line):
        auth_start = i
    elif auth_start is not None and auth_end is None and re.match(r"^  [a-zA-Z0-9_-]+:\s*$", line):
        auth_end = i
        break

if auth_start is None:
    raise SystemExit("auth service not found in docker-compose.yml")
if auth_end is None:
    auth_end = len(lines)

block = lines[auth_start:auth_end]
filtered = [l for l in block if not re.match(r"^    hostname:\s*", l)]
out_block = []
inserted = False
for line in filtered:
    out_block.append(line)
    if not inserted and "container_name:" in line and "supabase-auth" in line:
        out_block.append(f"    hostname: {mail_helo}\n")
        inserted = True
if not inserted:
    for idx, line in enumerate(out_block):
        if re.match(r"^    image:\s*", line):
            out_block.insert(idx + 1, f"    hostname: {mail_helo}\n")
            inserted = True
            break
if not inserted:
    raise SystemExit("could not insert hostname under auth")

path.write_text("".join(lines[:auth_start] + out_block + lines[auth_end:]))
print(f"auth.hostname set to {mail_helo}")
subprocess.run(["docker", "compose", "config", "-q"], check=True)
PY

docker compose up -d --force-recreate --no-deps auth
docker compose restart kong
echo "auth hostname: $(docker inspect supabase-auth --format '{{.Config.Hostname}}')"

echo ""
echo "=== Patch app-web hostname + SMTP_HELO_NAME ==="
if [[ -f "$APP_COMPOSE" ]]; then
  python3 <<PY
from pathlib import Path
import re

mail_helo = "${MAIL_HELO}"
path = Path("${APP_COMPOSE}")
text = path.read_text()
if re.search(r"^\s+hostname:\s*mail\.zeip\.ru\s*$", text, re.M):
    print("app-web hostname already set")
else:
    if "container_name: app-web" in text:
        text = text.replace(
            "container_name: app-web\n",
            f"container_name: app-web\n    hostname: {mail_helo}\n",
            1,
        )
        path.write_text(text)
        print(f"app-web hostname set to {mail_helo}")
    else:
        print("WARN: app-web block not found in docker-compose.app.yml")
PY
else
  echo "WARN: ${APP_COMPOSE} not found"
fi

ensure_env_kv() {
  local file="$1" key="$2" value="$3"
  grep -v "^${key}=" "$file" > "${file}.tmp" 2>/dev/null || true
  mv "${file}.tmp" "$file"
  echo "${key}='${value}'" >> "$file"
}

if [[ -f "$APP_ENV" ]]; then
  ensure_env_kv "$APP_ENV" "SMTP_HELO_NAME" "$MAIL_HELO"
  echo "SMTP_HELO_NAME synced in .env.app"
  if [[ -f "${APP_DIR}/scripts/vps/sync-smtp-to-env-app.sh" ]]; then
    bash "${APP_DIR}/scripts/vps/sync-smtp-to-env-app.sh" --recreate
  else
    cd "${APP_DIR}/deploy/timeweb"
    docker compose --env-file .env.app -f docker-compose.app.yml up -d --force-recreate --no-deps app-web
    echo "app-web recreated"
  fi
else
  echo "WARN: ${APP_ENV} not found — skip app-web"
fi

echo ""
echo "=== Verify ==="
docker exec app-web printenv SMTP_HELO_NAME 2>/dev/null || echo "SMTP_HELO_NAME not in app-web env"
echo "Done. HELO should be ${MAIL_HELO} (not twc1.net)."
