#!/usr/bin/env bash
# Добавляет hostname: mail.zeip.ru сервису auth в supabase-stack/docker-compose.yml
#
# На VPS:
#   bash /root/zeip/my-app/scripts/vps/patch-compose-auth-helo.sh
#
set -euo pipefail

STACK_DIR="${STACK_DIR:-/root/zeip/supabase-stack}"
MAIL_HELO="${MAIL_HELO:-mail.zeip.ru}"

cd "$STACK_DIR"

if [[ ! -f docker-compose.yml ]]; then
  echo "Error: ${STACK_DIR}/docker-compose.yml not found"
  exit 1
fi

cp docker-compose.yml "docker-compose.yml.bak.helo.$(date +%s)"

python3 <<PY
from pathlib import Path
import re
import subprocess

mail_helo = "${MAIL_HELO}"
path = Path("docker-compose.yml")
lines = path.read_text().splitlines(keepends=True)

auth_start = None
auth_end = None
auth_indent = None

for i, line in enumerate(lines):
    if re.match(r"^  auth:\s*$", line):
        auth_start = i
        auth_indent = "    "
        continue
    if auth_start is not None and auth_end is None:
        if re.match(r"^  [a-zA-Z0-9_-]+:\s*$", line) and not line.startswith("    "):
            auth_end = i
            break

if auth_start is None:
    raise SystemExit("auth service not found in docker-compose.yml")

if auth_end is None:
    auth_end = len(lines)

block = lines[auth_start:auth_end]
hostname_re = re.compile(r"^    hostname:\s*")

filtered = [line for line in block if not hostname_re.match(line)]

inserted = False
out_block = []
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
    raise SystemExit("could not find anchor to insert hostname under auth service")

new_lines = lines[:auth_start] + out_block + lines[auth_end:]
path.write_text("".join(new_lines))
print(f"auth.hostname set to {mail_helo}")
subprocess.run(["docker", "compose", "config", "-q"], check=True)
print("docker compose config OK")
PY

echo "=== Recreate auth (HELO hostname) ==="
docker compose up -d --force-recreate --no-deps auth
docker compose restart kong
docker inspect supabase-auth --format '{{.Config.Hostname}}'

echo "Done."
