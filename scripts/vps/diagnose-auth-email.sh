#!/usr/bin/env bash
# Диагностика цепочки auth-писем: GoTrue → templates-server → SMTP → Gmail/Yandex
#
# Папка на VPS:
#   cd /root/zeip/supabase-stack
#   bash /root/zeip/my-app/scripts/vps/diagnose-auth-email.sh [test@example.com]
#
# С Mac (одна SSH-сессия):
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#   bash scripts/vps/run-diagnose-auth-email-remote.sh [test@example.com]
#
set -euo pipefail

TEST_TO="${1:-test@gmail.com}"
STACK_DIR="${STACK_DIR:-/root/zeip/supabase-stack}"
ENV_FILE="${ENV_FILE:-${STACK_DIR}/.env}"
APP_DIR="${APP_DIR:-/root/zeip/my-app}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: env not found: $ENV_FILE"
  exit 1
fi

cd "$STACK_DIR"

echo "=== Note ==="
echo "POST /auth/v1/recover and UI «Забыли пароль?» отправляют письмо."
echo "POST /auth/v1/admin/generate_link письмо НЕ шлёт — только JSON со ссылкой."
echo ""

echo "=== Mail infrastructure (docker compose ps) ==="
docker compose ps templates-server auth 2>/dev/null || true

echo ""
echo "=== SMTP env check ==="
if [[ -f "${APP_DIR}/scripts/migration/check_smtp_env.sh" ]]; then
  bash "${APP_DIR}/scripts/migration/check_smtp_env.sh" "$ENV_FILE" || true
else
  grep -E '^SMTP_|^GOTRUE_SMTP_|^MAILER_|^ENABLE_EMAIL_AUTOCONFIRM=' "$ENV_FILE" || true
fi

echo ""
echo "=== Auth container env (no passwords) ==="
docker inspect supabase-auth --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null \
  | grep -E 'GOTRUE_SMTP|AUTOCONFIRM|MAILER|SITE_URL|URI_ALLOW|EXTERNAL_HOSTS' \
  | grep -v PASS || echo "supabase-auth not running"

echo ""
echo "=== Template files on disk ==="
ls -la volumes/templates/ 2>/dev/null || echo "volumes/templates/ missing"

echo ""
echo "=== templates-server from auth container ==="
for tpl in recovery.html confirm.html; do
  echo "--- http://templates-server/${tpl} ---"
  if docker exec supabase-auth wget -qO- --timeout=5 "http://templates-server/${tpl}" 2>/dev/null | head -3; then
    echo "(OK)"
  else
    echo "FAIL: cannot fetch ${tpl} from auth container"
    echo "Fix: bash ${APP_DIR}/scripts/vps/fix-auth-email-on-vps.sh"
  fi
done

echo ""
echo "=== Auth logs (6h, mail/smtp/template/errors) ==="
docker compose logs auth --since 6h 2>/dev/null \
  | grep -iE 'mail|smtp|template|signup|recovery|error|550|554|535|421|failed|timeout' \
  | tail -120 || true

echo ""
echo "=== TLS probe (smtp.timeweb.ru) ==="
if command -v openssl >/dev/null 2>&1; then
  echo "--- :465 ---"
  timeout 10 openssl s_client -connect smtp.timeweb.ru:465 -quiet </dev/null 2>&1 | head -3 || echo "465 probe failed"
  echo "--- :587 STARTTLS ---"
  timeout 10 openssl s_client -starttls smtp -connect smtp.timeweb.ru:587 -quiet </dev/null 2>&1 | head -3 || echo "587 probe failed"
fi

echo ""
echo "=== swaks test to ${TEST_TO} (nohup, SSH-safe) ==="
if ! command -v swaks >/dev/null 2>&1; then
  echo "Installing swaks..."
  apt-get update -qq && apt-get install -y swaks
fi

SMTP_HOST=$(grep '^GOTRUE_SMTP_HOST=' "$ENV_FILE" | cut -d= -f2-)
if [[ -z "$SMTP_HOST" ]]; then
  SMTP_HOST=$(grep '^SMTP_HOST=' "$ENV_FILE" | cut -d= -f2-)
fi
SMTP_PORT=$(grep '^GOTRUE_SMTP_PORT=' "$ENV_FILE" | cut -d= -f2-)
if [[ -z "$SMTP_PORT" ]]; then
  SMTP_PORT=$(grep '^SMTP_PORT=' "$ENV_FILE" | cut -d= -f2-)
fi
SMTP_USER=$(grep '^GOTRUE_SMTP_USER=' "$ENV_FILE" | cut -d= -f2-)
if [[ -z "$SMTP_USER" ]]; then
  SMTP_USER=$(grep '^SMTP_USER=' "$ENV_FILE" | cut -d= -f2-)
fi
SMTP_PASS=$(grep '^GOTRUE_SMTP_PASS=' "$ENV_FILE" | cut -d= -f2-)
if [[ -z "$SMTP_PASS" ]]; then
  SMTP_PASS=$(grep '^SMTP_PASS=' "$ENV_FILE" | cut -d= -f2-)
fi
FROM=$(grep '^GOTRUE_SMTP_ADMIN_EMAIL=' "$ENV_FILE" | cut -d= -f2-)
if [[ -z "$FROM" ]]; then
  FROM=$(grep '^SMTP_ADMIN_EMAIL=' "$ENV_FILE" | cut -d= -f2-)
fi

SWAKS_TLS_ARGS=(--tls-on-connect)
if [[ "$SMTP_PORT" == "587" ]]; then
  SWAKS_TLS_ARGS=(--tls)
fi

LOG="/tmp/zeip-swaks-$(date +%Y%m%d-%H%M%S).log"
echo "Logging to ${LOG}"

nohup swaks --to "$TEST_TO" \
  --from "$FROM" \
  --server "$SMTP_HOST" --port "$SMTP_PORT" \
  --auth LOGIN --auth-user "$SMTP_USER" --auth-password "$SMTP_PASS" \
  "${SWAKS_TLS_ARGS[@]}" \
  --header "Subject: Zeip SMTP test $(date +%H:%M)" \
  --body "Test from $(hostname) at $(date -Iseconds). Check Inbox, Spam, Promotions." \
  > "$LOG" 2>&1 &
SWAKS_PID=$!

for _ in $(seq 1 30); do
  if ! kill -0 "$SWAKS_PID" 2>/dev/null; then
    break
  fi
  sleep 1
done

if kill -0 "$SWAKS_PID" 2>/dev/null; then
  echo "swaks still running (pid ${SWAKS_PID}). Check later: cat ${LOG}"
else
  cat "$LOG"
fi

echo ""
if grep -q '250 ' "$LOG" 2>/dev/null; then
  echo "swaks: 250 OK — SMTP accepted. If inbox empty → spam or provider reputation."
elif grep -qiE '535|authentication' "$LOG" 2>/dev/null; then
  echo "swaks: auth failed — update SMTP password in Timeweb panel + .env, then:"
  echo "  bash ${APP_DIR}/scripts/vps/fix-auth-email-on-vps.sh"
elif grep -qiE '550|554|421' "$LOG" 2>/dev/null; then
  echo "swaks: server rejected — check Timeweb mailbox noreply@zeip.ru"
else
  echo "swaks: inconclusive — cat ${LOG}"
  echo "If timeout on 465, try port 587: bash ${APP_DIR}/scripts/vps/fix-auth-email-on-vps.sh --smtp-587"
fi

echo ""
echo "Done. Trigger live recover from Mac:"
echo "  cd ${APP_DIR} && bash scripts/vps/trigger-recover-test.sh YOUR@gmail.com"
