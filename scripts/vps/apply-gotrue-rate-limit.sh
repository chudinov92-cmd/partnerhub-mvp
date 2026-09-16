#!/usr/bin/env bash
# GoTrue rate limits + Kong rate-limiting на /auth/v1/* (10 req/min/IP).
# Kong DB-less: лимит пишется в volumes/api/kong.yml, не через Admin API.
#
# Запуск на VPS:
#   cd /root/zeip/my-app && bash scripts/vps/apply-gotrue-rate-limit.sh
#
# С Mac:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app && bash scripts/vps/run-apply-gotrue-rate-limit-remote.sh
set -euo pipefail

THIS_DIR="$(cd "$(dirname "$0")" && pwd)"
STACK_DIR="${STACK_DIR:-/root/zeip/supabase-stack}"

if [[ ! -d "${STACK_DIR}" ]]; then
  echo "ОШИБКА: нет ${STACK_DIR}"
  exit 1
fi

cd "${STACK_DIR}"

ensure_env_kv() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${val}|" .env
  else
    echo "${key}=${val}" >> .env
  fi
}

echo "=== 1. GoTrue .env ==="
ensure_env_kv "GOTRUE_RATE_LIMIT_HEADER" "X-Forwarded-For"
ensure_env_kv "GOTRUE_RATE_LIMIT_EMAIL_SENT" "10"
ensure_env_kv "GOTRUE_RATE_LIMIT_OTP" "10"
ensure_env_kv "GOTRUE_RATE_LIMIT_VERIFY" "10"
ensure_env_kv "GOTRUE_RATE_LIMIT_TOKEN_REFRESH" "150"

grep -E '^GOTRUE_RATE_LIMIT_' .env || true

echo "=== 2. docker-compose.yml: проброс GOTRUE_RATE_LIMIT_* ==="
if ! grep -q 'GOTRUE_RATE_LIMIT_HEADER' docker-compose.yml; then
  python3 <<'PY'
from pathlib import Path

path = Path("docker-compose.yml")
text = path.read_text()
needle = "GOTRUE_JWT_EXP"
if needle not in text:
    raise SystemExit("GOTRUE_JWT_EXP not found — добавьте GOTRUE_RATE_LIMIT_* в auth.environment вручную")

insert = (
    "      GOTRUE_RATE_LIMIT_HEADER: ${GOTRUE_RATE_LIMIT_HEADER:-X-Forwarded-For}\n"
    "      GOTRUE_RATE_LIMIT_EMAIL_SENT: ${GOTRUE_RATE_LIMIT_EMAIL_SENT:-10}\n"
    "      GOTRUE_RATE_LIMIT_OTP: ${GOTRUE_RATE_LIMIT_OTP:-10}\n"
    "      GOTRUE_RATE_LIMIT_VERIFY: ${GOTRUE_RATE_LIMIT_VERIFY:-10}\n"
    "      GOTRUE_RATE_LIMIT_TOKEN_REFRESH: ${GOTRUE_RATE_LIMIT_TOKEN_REFRESH:-150}\n"
)

lines = text.splitlines(keepends=True)
out: list[str] = []
patched = False
for line in lines:
    out.append(line)
    if not patched and needle in line:
        out.append(insert)
        patched = True

if not patched:
    raise SystemExit("Failed to patch docker-compose.yml")

path.write_text("".join(out))
print("docker-compose.yml patched")
PY
else
  echo "docker-compose.yml already has GOTRUE_RATE_LIMIT_* mapping"
fi

echo "=== 3. Пересоздание auth + restart kong ==="
docker compose up -d --force-recreate auth
docker compose restart kong

echo "=== applied auth env ==="
docker inspect supabase-auth --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep GOTRUE_RATE_LIMIT || true

echo "=== 4. Kong declarative rate-limiting (kong.yml, 10/min/IP) ==="
bash "${THIS_DIR}/patch-kong-auth-rate-limit.sh"
