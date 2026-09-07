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
echo "=== Docker networks (auth vs templates-server) ==="
AUTH_NETS="$(docker inspect supabase-auth --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null || true)"
TPL_CID="$(docker compose ps -q templates-server 2>/dev/null || true)"
TPL_NETS=""
if [[ -n "$TPL_CID" ]]; then
  TPL_NETS="$(docker inspect "$TPL_CID" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null || true)"
fi
echo "auth: ${AUTH_NETS:-unknown}"
echo "templates-server: ${TPL_NETS:-not running}"

fetch_template() {
  local tpl="$1"
  local url="http://templates-server/${tpl}"
  local body=""

  # GoTrue image often has no wget/curl — use sidecar on auth network namespace
  body="$(docker run --rm --network "container:supabase-auth" curlimages/curl:8.5.0 \
    -sf --max-time 8 "$url" 2>/dev/null || true)"
  if [[ -n "$body" ]]; then
    printf '%s' "$body"
    return 0
  fi

  # Fallback: first network of auth container
  local net
  net="$(docker inspect supabase-auth --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}' 2>/dev/null | head -1)"
  if [[ -n "$net" ]]; then
    body="$(docker run --rm --network "$net" curlimages/curl:8.5.0 \
      -sf --max-time 8 "$url" 2>/dev/null || true)"
    if [[ -n "$body" ]]; then
      printf '%s' "$body"
      return 0
    fi
  fi

  # Local check on templates-server itself
  if [[ -n "$TPL_CID" ]]; then
    body="$(docker exec "$TPL_CID" wget -qO- --timeout=5 "http://127.0.0.1/${tpl}" 2>/dev/null || true)"
    if [[ -n "$body" ]]; then
      printf '%s' "$body"
      echo "(templates-server local OK; auth may not reach templates-server — check compose networks)" >&2
      return 0
    fi
  fi
  return 1
}

echo ""
echo "=== templates-server HTTP (same network as auth) ==="
for tpl in recovery.html confirm.html; do
  echo "--- http://templates-server/${tpl} ---"
  body="$(fetch_template "$tpl" || true)"
  if [[ -n "$body" ]]; then
    printf '%s\n' "$body" | head -3
    echo "(OK)"
  else
    echo "FAIL: auth network cannot reach ${tpl}"
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
echo "=== swaks test to ${TEST_TO} (background — SSH-safe) ==="
if [[ "${ZEIP_SKIP_SWAKS:-}" == "1" ]]; then
  echo "Skipped (ZEIP_SKIP_SWAKS=1). Run: bash ${APP_DIR}/scripts/vps/run-swaks-on-vps.sh ${TEST_TO}"
else
  if ! command -v swaks >/dev/null 2>&1; then
    echo "Installing swaks..."
    apt-get update -qq && apt-get install -y swaks
  fi

  SMTP_HOST="$(read_env GOTRUE_SMTP_HOST SMTP_HOST)"
  SMTP_PORT="$(read_env GOTRUE_SMTP_PORT SMTP_PORT)"
  SMTP_USER="$(read_env GOTRUE_SMTP_USER SMTP_USER)"
  SMTP_PASS="$(read_env GOTRUE_SMTP_PASS SMTP_PASS)"
  FROM="$(read_env GOTRUE_SMTP_ADMIN_EMAIL SMTP_ADMIN_EMAIL)"

  SWAKS_TLS_ARGS=(--tls-on-connect)
  if [[ "$SMTP_PORT" == "587" ]]; then
    SWAKS_TLS_ARGS=(--tls)
  fi

  LOG="/tmp/zeip-swaks-latest.log"
  echo "Logging to ${LOG} (detached; SSH may close before swaks finishes)"

  nohup bash -c "timeout 90 swaks --to '${TEST_TO}' \
    --from '${FROM}' \
    --server '${SMTP_HOST}' --port '${SMTP_PORT}' \
    --auth LOGIN --auth-user '${SMTP_USER}' --auth-password '${SMTP_PASS}' \
    ${SWAKS_TLS_ARGS[*]} \
    --header 'Subject: Zeip SMTP test $(date +%H:%M)' \
    --body 'Test from $(hostname)' \
    > '${LOG}' 2>&1" </dev/null >/dev/null 2>&1 &

  echo "swaks pid $! — wait 20s, then on VPS: cat ${LOG}"
  sleep 3
  if [[ -s "$LOG" ]]; then
    tail -20 "$LOG"
  fi

  if grep -q '250 ' "$LOG" 2>/dev/null; then
    echo "swaks: 250 OK — SMTP accepted."
  elif [[ -s "$LOG" ]]; then
    echo "swaks: see full log — cat ${LOG}"
  else
    echo "swaks: still running or SSH closed early — reconnect and: cat ${LOG}"
  fi
fi

echo ""
echo "Done. Trigger live recover from Mac:"
echo "  cd ${APP_DIR} && bash scripts/vps/trigger-recover-test.sh YOUR@gmail.com"
