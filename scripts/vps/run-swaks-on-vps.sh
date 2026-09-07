#!/usr/bin/env bash
# SMTP swaks-тест на VPS (отдельно от diagnose — SSH не обрывается).
# Папка на VPS:
#   bash /root/zeip/my-app/scripts/vps/run-swaks-on-vps.sh test@gmail.com
#
set -euo pipefail

TEST_TO="${1:-test@gmail.com}"
STACK_DIR="${STACK_DIR:-/root/zeip/supabase-stack}"
ENV_FILE="${ENV_FILE:-${STACK_DIR}/.env}"

cd "$STACK_DIR"

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
  printf '%s' "$val"
}

SMTP_HOST="$(read_env GOTRUE_SMTP_HOST SMTP_HOST)"
SMTP_PORT="$(read_env GOTRUE_SMTP_PORT SMTP_PORT)"
SMTP_USER="$(read_env GOTRUE_SMTP_USER SMTP_USER)"
SMTP_PASS="$(read_env GOTRUE_SMTP_PASS SMTP_PASS)"
FROM="$(read_env GOTRUE_SMTP_ADMIN_EMAIL SMTP_ADMIN_EMAIL)"

if [[ -z "$SMTP_HOST" || -z "$SMTP_PORT" || -z "$SMTP_USER" || -z "$SMTP_PASS" || -z "$FROM" ]]; then
  echo "Error: incomplete SMTP config in ${ENV_FILE}"
  exit 1
fi

TLS=(--tls-on-connect)
[[ "$SMTP_PORT" == "587" ]] && TLS=(--tls)

LOG="/tmp/zeip-swaks-latest.log"
echo "swaks → ${TEST_TO}, log: ${LOG}"

timeout 90 swaks --to "$TEST_TO" \
  --from "$FROM" \
  --server "$SMTP_HOST" --port "$SMTP_PORT" \
  --auth LOGIN --auth-user "$SMTP_USER" --auth-password "$SMTP_PASS" \
  "${TLS[@]}" \
  --header "Subject: Zeip SMTP test $(date +%H:%M)" \
  --body "Test from $(hostname)" \
  2>&1 | tee "$LOG"

if grep -q '250 ' "$LOG"; then
  echo "RESULT: 250 OK"
else
  echo "RESULT: check log above"
fi
