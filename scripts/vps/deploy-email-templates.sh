#!/usr/bin/env bash
# Деплой GoTrue email-шаблонов (confirm + recovery) на VPS — одна SSH-сессия.
#
# Папка:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#
# Интерактивно (пароль спросят один раз):
#   bash scripts/vps/deploy-email-templates.sh
#
# С паролем (нужен sshpass: brew install hudochenkov/sshpass/sshpass):
#   VPS_SSH_PASSWORD='реальный_пароль' bash scripts/vps/deploy-email-templates.sh
#
# НЕ подставляйте буквально «ваш_пароль» — это placeholder из инструкции.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST="${VPS_HOST:-root@186.246.2.104}"
TEMPLATES_DIR="${ROOT}/deploy/timeweb/supabase/email-templates"

SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15)

if [[ ! -f "${TEMPLATES_DIR}/confirm.html" ]] || [[ ! -f "${TEMPLATES_DIR}/recovery.html" ]]; then
  echo "Missing templates in ${TEMPLATES_DIR}"
  exit 1
fi

if [[ "${VPS_SSH_PASSWORD:-}" == "ваш_пароль" ]] || [[ "${VPS_SSH_PASSWORD:-}" == "***" ]]; then
  echo "Ошибка: VPS_SSH_PASSWORD — это placeholder из инструкции, не реальный пароль."
  echo "Либо задайте настоящий пароль, либо запустите без переменной (интерактивно):"
  echo "  bash scripts/vps/deploy-email-templates.sh"
  exit 1
fi

CONFIRM_B64="$(base64 < "${TEMPLATES_DIR}/confirm.html" | tr -d '\n')"
RECOVERY_B64="$(base64 < "${TEMPLATES_DIR}/recovery.html" | tr -d '\n')"

REMOTE_SCRIPT="$(cat <<REMOTE
set -euo pipefail
cd /root/zeip/supabase-stack
mkdir -p volumes/templates

echo "=== Writing templates ==="
base64 -d > volumes/templates/confirm.html <<'B64_CONFIRM'
${CONFIRM_B64}
B64_CONFIRM

base64 -d > volumes/templates/recovery.html <<'B64_RECOVERY'
${RECOVERY_B64}
B64_RECOVERY

ls -la volumes/templates/

ensure_env_kv() {
  local key="\$1"
  local value="\$2"
  if grep -q "^\${key}=" .env 2>/dev/null; then
    sed -i "s|^\${key}=.*|\${key}=\${value}|" .env
  else
    echo "\${key}=\${value}" >> .env
  fi
}

ensure_env_kv "MAILER_SUBJECTS_CONFIRMATION" "Подтвердите email — Zeip"
ensure_env_kv "MAILER_TEMPLATES_CONFIRMATION" "http://templates-server/confirm.html"
ensure_env_kv "MAILER_SUBJECTS_RECOVERY" "Сброс пароля — Zeip"
ensure_env_kv "MAILER_TEMPLATES_RECOVERY" "http://templates-server/recovery.html"

echo "=== .env (mailer keys) ==="
grep -E '^MAILER_' .env || true

echo "=== patch docker-compose.yml (idempotent) ==="
cp docker-compose.yml "docker-compose.yml.bak.\$(date +%s)"

python3 <<'PY'
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

# Удаляем все старые/дублирующиеся строки mailer-шаблонов
filtered = [line for line in lines if not key_re.match(line)]

needle = "GOTRUE_SMTP_ADMIN_EMAIL"
if not any(needle in line for line in filtered):
    needle = "GOTRUE_SITE_URL"
if not any(needle in line for line in filtered):
    raise SystemExit("Cannot find anchor in docker-compose.yml for mailer env patch")

block = [f"      {key}: {value}\n" for key, value in mailer_keys.items()]

out = []
inserted = False
for line in filtered:
    out.append(line)
    if not inserted and needle in line:
        out.extend(block)
        inserted = True

if not inserted:
    raise SystemExit("Failed to patch docker-compose.yml")

path.write_text("".join(out))
print("docker-compose.yml patched (mailer templates, deduplicated)")

subprocess.run(["docker", "compose", "config", "-q"], check=True)
print("docker compose config OK")
PY

if ! grep -q "templates-server:" docker-compose.yml; then
  echo "=== adding templates-server service ==="
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

docker compose up -d --force-recreate --no-deps templates-server auth
docker compose restart kong

echo "=== auth mailer env ==="
docker inspect supabase-auth --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -E 'GOTRUE_MAILER|GOTRUE_SMTP_ADMIN' || true

echo "=== templates-server ==="
docker compose ps templates-server || true
REMOTE
)"

run_once() {
  local tmp
  tmp="$(mktemp)"
  printf '%s\n' "$REMOTE_SCRIPT" > "$tmp"

  if [[ -n "${VPS_SSH_PASSWORD:-}" ]]; then
    if command -v sshpass >/dev/null 2>&1; then
      SSHPASS="$VPS_SSH_PASSWORD" sshpass -e ssh "${SSH_OPTS[@]}" "$HOST" bash -s < "$tmp"
    elif command -v expect >/dev/null 2>&1; then
      export VPS_SSH_PASSWORD
      expect "$ROOT/scripts/vps/ssh-with-password.expect" "$HOST" "$tmp"
    else
      echo "Для VPS_SSH_PASSWORD нужен sshpass или expect."
      echo "  brew install hudochenkov/sshpass/sshpass"
      echo "Или запустите без переменной — пароль спросят один раз:"
      echo "  bash scripts/vps/deploy-email-templates.sh"
      rm -f "$tmp"
      exit 1
    fi
  else
    echo "=== Одна SSH-сессия (введите пароль root один раз) ==="
    ssh "${SSH_OPTS[@]}" "$HOST" bash -s < "$tmp"
  fi

  rm -f "$tmp"
}

run_once
echo "Done. Auth emails should use Russian templates from noreply@zeip.ru"
