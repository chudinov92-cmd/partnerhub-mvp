#!/usr/bin/env bash
# Email Fix Plan — выполнять НА VPS после ssh root@186.246.2.104
# Папка:
#   cd /root/zeip/my-app
#   git pull --ff-only
#   bash scripts/vps/run-email-fix-plan-on-vps.sh
#
# Шаг 1 (DMARC) — вручную в панели Timeweb DNS до или после этого скрипта.
set -euo pipefail

APP_DIR="${APP_DIR:-/root/zeip/my-app}"
STACK_DIR="${STACK_DIR:-/root/zeip/supabase-stack}"

echo "=============================================="
echo " Email Fix Plan — VPS"
echo "=============================================="
echo ""

echo "=== Шаг 0: текущий DMARC (DNS) ==="
DMARC="$(dig +short TXT _dmarc.zeip.ru @8.8.8.8 2>/dev/null | tr -d '"' || true)"
if [[ -z "$DMARC" ]]; then
  echo "WARN: DMARC не найден в DNS"
elif grep -q 'p=quarantine' <<< "$DMARC"; then
  echo "Текущий DMARC: $DMARC"
  echo ""
  echo ">>> ДЕЙСТВИЕ ВРУЧНУЮ (Timeweb → DNS → zeip.ru):"
  echo "    TXT _dmarc.zeip.ru →"
  echo "    v=DMARC1; p=none; rua=mailto:dmarc@zeip.ru"
  echo ""
  echo "    После сохранения подождите 5–15 мин (TTL), затем повторите recovery-тест."
else
  echo "DMARC OK (не quarantine): $DMARC"
fi
echo ""

echo "=== Шаг 1: sync SMTP stack → .env.app + recreate app-web ==="
if [[ ! -f "${APP_DIR}/scripts/vps/sync-smtp-to-env-app.sh" ]]; then
  echo "ERROR: ${APP_DIR}/scripts/vps/sync-smtp-to-env-app.sh not found"
  echo "       git pull --ff-only в ${APP_DIR}"
  exit 1
fi
bash "${APP_DIR}/scripts/vps/sync-smtp-to-env-app.sh" --recreate

echo ""
echo "=== Шаг 2: auth SMTP (GoTrue) — без изменений, только проверка ==="
if [[ -d "$STACK_DIR" ]]; then
  cd "$STACK_DIR"
  docker inspect supabase-auth --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null \
    | grep -E 'GOTRUE_SMTP_HOST|GOTRUE_SMTP_PORT|GOTRUE_SMTP_USER|GOTRUE_SMTP_ADMIN' || true
fi

echo ""
echo "=== Шаг 3: recovery-тест (опционально) ==="
echo "  UI: https://zeip.ru/auth → Забыли пароль? → v.chudinov.direct@yandex.ru"
echo "  Или: bash ${APP_DIR}/scripts/vps/trigger-recover-test.sh v.chudinov.direct@yandex.ru"
echo ""
echo "=== Готово ==="
echo "Через 2–4 недели вернуть DMARC: p=quarantine (когда репутация IP стабилизируется)."
