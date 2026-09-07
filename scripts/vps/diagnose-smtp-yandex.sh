#!/usr/bin/env bash
# Диагностика доставки auth-писем (signup/recovery) на @yandex.ru
#
# Папка на VPS:
#   cd /root/zeip/supabase-stack
#   bash /root/zeip/my-app/scripts/vps/diagnose-smtp-yandex.sh [test@yandex.ru]
#
set -euo pipefail

TEST_TO="${1:-v.chudinov.direct@yandex.ru}"
STACK_DIR="${STACK_DIR:-/root/zeip/supabase-stack}"
ENV_FILE="${ENV_FILE:-${STACK_DIR}/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: env not found: $ENV_FILE"
  exit 1
fi

cd "$STACK_DIR"

echo "=== SMTP env check ==="
bash /root/zeip/my-app/scripts/migration/check_smtp_env.sh "$ENV_FILE" || true

echo ""
echo "=== Auth container env (no passwords) ==="
docker inspect supabase-auth --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null \
  | grep -E 'GOTRUE_SMTP|AUTOCONFIRM|MAILER|SITE_URL|URI_ALLOW' \
  | grep -v PASS || echo "supabase-auth not running"

echo ""
echo "=== Auth logs (6h, mail/smtp/yandex) ==="
docker compose logs auth --since 6h 2>/dev/null \
  | grep -iE 'Cuidinovtechno|v\.chudinov|mail|smtp|signup|recovery|error|550|554|421|yandex' \
  | tail -100 || true

echo ""
echo "=== swaks test to ${TEST_TO} ==="
if ! command -v swaks >/dev/null 2>&1; then
  echo "Installing swaks..."
  apt-get update -qq && apt-get install -y swaks
fi

SMTP_HOST=$(grep '^GOTRUE_SMTP_HOST=' "$ENV_FILE" | cut -d= -f2-)
SMTP_PORT=$(grep '^GOTRUE_SMTP_PORT=' "$ENV_FILE" | cut -d= -f2-)
SMTP_USER=$(grep '^GOTRUE_SMTP_USER=' "$ENV_FILE" | cut -d= -f2-)
SMTP_PASS=$(grep '^GOTRUE_SMTP_PASS=' "$ENV_FILE" | cut -d= -f2-)
FROM=$(grep '^GOTRUE_SMTP_ADMIN_EMAIL=' "$ENV_FILE" | cut -d= -f2-)

swaks --to "$TEST_TO" \
  --from "$FROM" \
  --server "$SMTP_HOST" --port "$SMTP_PORT" \
  --auth LOGIN --auth-user "$SMTP_USER" --auth-password "$SMTP_PASS" \
  --tls \
  --header "Subject: Zeip SMTP test $(date +%H:%M)" \
  --body "Test from $(hostname) at $(date -Iseconds). Check Inbox, Spam, Promotions in Yandex."

echo ""
echo "Done. If swaks=250 but Yandex empty → reputation/filtering. If 550/554 → SMTP config or block."
