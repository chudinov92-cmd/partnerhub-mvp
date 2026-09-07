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

SMTP_HOST=$(grep '^GOTRUE_SMTP_HOST=' "$ENV_FILE" | cut -d= -f2-)
[[ -z "$SMTP_HOST" ]] && SMTP_HOST=$(grep '^SMTP_HOST=' "$ENV_FILE" | cut -d= -f2-)
SMTP_PORT=$(grep '^GOTRUE_SMTP_PORT=' "$ENV_FILE" | cut -d= -f2-)
[[ -z "$SMTP_PORT" ]] && SMTP_PORT=$(grep '^SMTP_PORT=' "$ENV_FILE" | cut -d= -f2-)
SMTP_USER=$(grep '^GOTRUE_SMTP_USER=' "$ENV_FILE" | cut -d= -f2-)
[[ -z "$SMTP_USER" ]] && SMTP_USER=$(grep '^SMTP_USER=' "$ENV_FILE" | cut -d= -f2-)
SMTP_PASS=$(grep '^GOTRUE_SMTP_PASS=' "$ENV_FILE" | cut -d= -f2-)
[[ -z "$SMTP_PASS" ]] && SMTP_PASS=$(grep '^SMTP_PASS=' "$ENV_FILE" | cut -d= -f2-)
FROM=$(grep '^GOTRUE_SMTP_ADMIN_EMAIL=' "$ENV_FILE" | cut -d= -f2-)
[[ -z "$FROM" ]] && FROM=$(grep '^SMTP_ADMIN_EMAIL=' "$ENV_FILE" | cut -d= -f2-)

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
