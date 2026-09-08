#!/usr/bin/env bash
# Тело для sync SMTP на VPS (через ssh bash -s с Mac, без git pull).
set -euo pipefail

STACK_ENV="${STACK_ENV:-/root/zeip/supabase-stack/.env}"
APP_ENV="${APP_ENV:-/root/zeip/my-app/deploy/timeweb/.env.app}"

if [[ ! -f "$STACK_ENV" ]]; then
  echo "Error: stack env not found: $STACK_ENV"
  exit 1
fi

if [[ ! -f "$APP_ENV" ]]; then
  echo "Error: app env not found: $APP_ENV"
  exit 1
fi

read_env() {
  local primary="$1"
  local fallback="${2:-}"
  local val
  val="$(grep "^${primary}=" "$STACK_ENV" 2>/dev/null | head -1 | cut -d= -f2- || true)"
  if [[ -z "$val" && -n "$fallback" ]]; then
    val="$(grep "^${fallback}=" "$STACK_ENV" 2>/dev/null | head -1 | cut -d= -f2- || true)"
  fi
  if [[ "$val" =~ ^\'.*\'$ ]]; then val="${val:1:-1}"; fi
  if [[ "$val" =~ ^\".*\"$ ]]; then val="${val:1:-1}"; fi
  printf '%s' "$val"
}

ensure_env_kv() {
  local file="$1"
  local key="$2"
  local value="$3"
  local escaped="${value//\'/\'\\\'\'}"
  grep -v "^${key}=" "$file" > "${file}.tmp" 2>/dev/null || true
  mv "${file}.tmp" "$file"
  echo "${key}='${escaped}'" >> "$file"
}

read_app_env() {
  local key="$1"
  local val
  val="$(grep "^${key}=" "$APP_ENV" 2>/dev/null | head -1 | cut -d= -f2- || true)"
  if [[ "$val" =~ ^\'.*\'$ ]]; then val="${val:1:-1}"; fi
  if [[ "$val" =~ ^\".*\"$ ]]; then val="${val:1:-1}"; fi
  printf '%s' "$val"
}

read_push_secret_from_db() {
  local val=""
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx 'supabase-db'; then
    val="$(docker exec supabase-db psql -U postgres -d postgres -tAc \
      "SELECT value FROM public.app_config WHERE key = 'push_internal_secret' LIMIT 1;" 2>/dev/null \
      | tr -d '[:space:]' || true)"
  fi
  printf '%s' "$val"
}

sync_internal_secrets() {
  local push_secret
  push_secret="$(read_app_env INTERNAL_PUSH_SECRET)"
  if [[ -z "$push_secret" || "$push_secret" == REPLACE_* ]]; then
    push_secret="$(read_push_secret_from_db)"
  fi
  if [[ -z "$push_secret" ]]; then
    echo "WARN: INTERNAL_PUSH_SECRET не задан в .env.app и не найден в app_config.push_internal_secret"
    return 0
  fi
  ensure_env_kv "$APP_ENV" "INTERNAL_PUSH_SECRET" "$push_secret"
  ensure_env_kv "$APP_ENV" "INTERNAL_EMAIL_SECRET" "$push_secret"
  echo "=== internal secrets synced ==="
}

HOST="$(read_env GOTRUE_SMTP_HOST SMTP_HOST)"
PORT="$(read_env GOTRUE_SMTP_PORT SMTP_PORT)"
USER="$(read_env GOTRUE_SMTP_USER SMTP_USER)"
PASS="$(read_env GOTRUE_SMTP_PASS SMTP_PASS)"
ADMIN="$(read_env GOTRUE_SMTP_ADMIN_EMAIL SMTP_ADMIN_EMAIL)"
SENDER="$(read_env GOTRUE_SMTP_SENDER_NAME SMTP_SENDER_NAME)"
[[ -z "$SENDER" ]] && SENDER="Zeip"

for key_val in "SMTP_HOST:$HOST" "SMTP_PORT:$PORT" "SMTP_USER:$USER" "SMTP_PASS:$PASS" "SMTP_ADMIN_EMAIL:$ADMIN"; do
  key="${key_val%%:*}"
  val="${key_val#*:}"
  if [[ -z "$val" ]]; then
    echo "Error: missing $key in $STACK_ENV"
    exit 1
  fi
done

ensure_env_kv "$APP_ENV" "SMTP_HOST" "$HOST"
ensure_env_kv "$APP_ENV" "SMTP_PORT" "$PORT"
ensure_env_kv "$APP_ENV" "SMTP_USER" "$USER"
ensure_env_kv "$APP_ENV" "SMTP_PASS" "$PASS"
ensure_env_kv "$APP_ENV" "SMTP_ADMIN_EMAIL" "$ADMIN"
ensure_env_kv "$APP_ENV" "SMTP_SENDER_NAME" "$SENDER"
sync_internal_secrets

echo "=== SMTP synced ==="
grep -E '^SMTP_' "$APP_ENV" | sed 's/^\(SMTP_PASS=\).*/\1***/'

cd /root/zeip/my-app/deploy/timeweb
docker compose --env-file .env.app -f docker-compose.app.yml up -d --force-recreate --no-deps app-web

echo "=== app-web SMTP env ==="
docker exec app-web printenv | grep -E '^SMTP_' | sed 's/^\(SMTP_PASS=\).*/\1***/'

echo "=== verify transactional email (no nodemailer in standalone image) ==="
sleep 3
SECRET="$(read_app_env INTERNAL_PUSH_SECRET)"
if [[ -z "$SECRET" ]]; then
  SECRET="$(read_app_env INTERNAL_EMAIL_SECRET)"
fi
HTTP_CODE="$(curl -sS -o /tmp/zeip-email-new-message.json -w '%{http_code}' \
  -X POST http://127.0.0.1:3001/api/email/new-message \
  -H 'Content-Type: application/json' \
  -H "x-internal-secret: ${SECRET}" \
  -d '{}' || echo '000')"
echo "POST /api/email/new-message → HTTP ${HTTP_CODE}"
head -c 200 /tmp/zeip-email-new-message.json 2>/dev/null || true
echo ""
if [[ "$HTTP_CODE" == "503" ]]; then
  echo "FAIL: app still reports SMTP is not configured"
  exit 1
fi
if [[ "$HTTP_CODE" == "200" ]]; then
  echo "transactional email endpoint: OK"
elif [[ "$HTTP_CODE" == "403" ]]; then
  echo "WARN: HTTP 403 — check INTERNAL_PUSH_SECRET in .env.app vs app_config.push_internal_secret"
else
  echo "WARN: unexpected HTTP ${HTTP_CODE}"
fi
