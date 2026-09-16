#!/usr/bin/env bash
# GoTrue rate limits + Kong rate-limiting на /auth/v1/* (10 req/min/IP).
#
# Запуск на VPS:
#   cd /root/zeip/my-app && bash scripts/vps/apply-gotrue-rate-limit.sh
#
# С Mac:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app && bash scripts/vps/run-apply-gotrue-rate-limit-remote.sh
set -euo pipefail

STACK_DIR="${STACK_DIR:-/root/zeip/supabase-stack}"
KONG_CONTAINER="${KONG_CONTAINER:-supabase-kong}"

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

echo "=== 4. Kong rate-limiting plugin (10/min/IP) на auth-v1 ==="
if ! docker ps --format '{{.Names}}' | grep -qx "${KONG_CONTAINER}"; then
  echo "WARN: контейнер ${KONG_CONTAINER} не найден — пропускаем Kong plugin"
  exit 0
fi

docker exec "${KONG_CONTAINER}" sh -c '
set -e
ADMIN=http://127.0.0.1:8001

service_id=""
for name in auth-v1 auth; do
  sid=$(curl -s "$ADMIN/services/$name" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get(\"id\") or \"\")" 2>/dev/null || true)
  if [ -n "$sid" ]; then
    service_id="$sid"
    break
  fi
done

if [ -z "$service_id" ]; then
  service_id=$(curl -s "$ADMIN/services" | python3 -c "
import sys, json
data = json.load(sys.stdin).get(\"data\", [])
for s in data:
    if \"auth\" in (s.get(\"name\") or \"\").lower():
        print(s[\"id\"])
        break
" 2>/dev/null || true)
fi

if [ -z "$service_id" ]; then
  echo "WARN: Kong service auth-v1 не найден — добавьте rate-limiting вручную"
  exit 0
fi

existing=$(curl -s "$ADMIN/services/$service_id/plugins" | python3 -c "
import sys, json
for p in json.load(sys.stdin).get(\"data\", []):
    if p.get(\"name\") == \"rate-limiting\":
        print(p.get(\"id\", \"\"))
        break
" 2>/dev/null || true)

if [ -n "$existing" ]; then
  curl -s -X PATCH "$ADMIN/plugins/$existing" \
    -d "config.minute=10" \
    -d "config.policy=local" \
    -d "config.limit_by=ip" \
    -d "config.hide_client_headers=true" >/dev/null
  echo "Kong rate-limiting plugin updated: $existing"
else
  curl -s -X POST "$ADMIN/services/$service_id/plugins" \
    -d "name=rate-limiting" \
    -d "config.minute=10" \
    -d "config.policy=local" \
    -d "config.limit_by=ip" \
    -d "config.hide_client_headers=true" >/dev/null
  echo "Kong rate-limiting plugin created on service $service_id"
fi
'

echo "Готово. Проверка: 15 быстрых POST /auth/v1/token — ожидаем 429 с ~11-го запроса."
