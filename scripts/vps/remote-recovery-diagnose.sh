#!/usr/bin/env bash
# Inline body для run-recovery-diagnose-remote.sh (ssh bash -s -- email@example.com).
# Self-contained — файлы на VPS не нужны.
set -euo pipefail

EMAIL="${1:-}"
if [[ -z "$EMAIL" ]]; then
  echo "ERROR: email required"
  exit 1
fi

STACK_DIR="${STACK_DIR:-/root/zeip/supabase-stack}"
ENV_FILE="${ENV_FILE:-${STACK_DIR}/.env}"

echo "=== SQL: auth.users for ${EMAIL} ==="
if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx 'supabase-db'; then
  docker exec supabase-db psql -U postgres -d postgres -c \
    "SELECT email, recovery_sent_at, email_confirmed_at, deleted_at
     FROM auth.users
     WHERE email = '${EMAIL}';" 2>/dev/null || echo "(psql failed)"
else
  echo "WARN: supabase-db not running"
fi

echo ""
echo "=== Auth logs (30m, mail/recovery/errors) ==="
if [[ -d "$STACK_DIR" ]]; then
  cd "$STACK_DIR"
  docker compose logs auth --since 30m 2>/dev/null \
    | grep -iE 'recovery|/recover|mail|smtp|template|error|550|554|535|421|450|failed|sent' \
    | tail -80 || echo "(no matching log lines)"
else
  echo "WARN: ${STACK_DIR} not found"
fi

echo ""
echo "=== templates-server from auth network ==="
fetch_template() {
  local tpl="$1"
  docker run --rm --network "container:supabase-auth" curlimages/curl:8.5.0 \
    -sf --max-time 8 "http://templates-server/${tpl}" 2>/dev/null | head -3 || echo "FAIL: ${tpl}"
}
fetch_template recovery.html

echo ""
echo "=== swaks → ${EMAIL} ==="
if ! command -v swaks >/dev/null 2>&1; then
  apt-get update -qq && apt-get install -y swaks
fi

read_env() {
  local primary="$1"
  local fallback="${2:-}"
  local val
  val="$(grep "^${primary}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- || true)"
  if [[ -z "$val" && -n "$fallback" ]]; then
    val="$(grep "^${fallback}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- || true)"
  fi
  if [[ "$val" =~ ^\'.*\'$ ]]; then val="${val:1:-1}"; fi
  if [[ "$val" =~ ^\".*\"$ ]]; then val="${val:1:-1}"; fi
  printf '%s' "$val"
}

SMTP_HOST="$(read_env GOTRUE_SMTP_HOST SMTP_HOST)"
SMTP_PORT="$(read_env GOTRUE_SMTP_PORT SMTP_PORT)"
SMTP_USER="$(read_env GOTRUE_SMTP_USER SMTP_USER)"
SMTP_PASS="$(read_env GOTRUE_SMTP_PASS SMTP_PASS)"
FROM="$(read_env GOTRUE_SMTP_ADMIN_EMAIL SMTP_ADMIN_EMAIL)"
SENDER_NAME="$(read_env GOTRUE_SMTP_SENDER_NAME SMTP_SENDER_NAME)"
SENDER_NAME="${SENDER_NAME:-Zeip}"

if [[ -z "$SMTP_HOST" || -z "$SMTP_PORT" || -z "$SMTP_USER" || -z "$SMTP_PASS" || -z "$FROM" ]]; then
  echo "ERROR: incomplete SMTP in ${ENV_FILE}"
  exit 1
fi

TLS=(--tls-on-connect)
[[ "$SMTP_PORT" == "587" ]] && TLS=(--tls)

LOG="/tmp/zeip-swaks-latest.log"
timeout 90 swaks --to "$EMAIL" \
  --from "$FROM" \
  --server "$SMTP_HOST" --port "$SMTP_PORT" \
  --auth LOGIN --auth-user "$SMTP_USER" --auth-password "$SMTP_PASS" \
  "${TLS[@]}" \
  --header "From: ${SENDER_NAME} <${FROM}>" \
  --header "Subject: Сброс пароля — Zeip (diagnose $(date +%H%M))" \
  --body "Диагностика доставки recovery для ${EMAIL}" \
  2>&1 | tee "$LOG"

echo ""
if grep -qE '250 (OK|Ok|ok)|250 2\.0\.0' "$LOG" 2>/dev/null; then
  echo "swaks: 250 OK — Timeweb принял письмо"
elif grep -q '535 ' "$LOG" 2>/dev/null; then
  echo "swaks: 535 AUTH FAIL — проверьте SMTP_PASS в ${ENV_FILE}"
  exit 1
elif grep -qE '421|450|451' "$LOG" 2>/dev/null; then
  echo "swaks: 4xx greylisting — подождите 30–90 мин, не слать массово"
else
  echo "swaks: см. лог выше"
fi

echo ""
echo "=== Recovery diagnose DONE ==="
