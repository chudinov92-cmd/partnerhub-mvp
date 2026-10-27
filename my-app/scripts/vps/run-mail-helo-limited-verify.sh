#!/usr/bin/env bash
# Ограниченная проверка доставки после HELO-fix (не более 1 письма на провайдера).
#
# Папка:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#   bash scripts/vps/run-mail-helo-limited-verify.sh MAIL_TESTER@mail-tester.com
#
# MAIL_TESTER — адрес с https://www.mail-tester.com/ (одно письмо).
# Опционально: YANDEX=... MAILRU=... GMAIL=... для по одному UI/swaks тесту.
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# Адрес с mail-tester.com (одно письмо; обновите при новом тесте)
MAIL_TESTER_DEFAULT="test-ws39tzgsf@srv1.mail-tester.com"
MAIL_TESTER="${1:-${MAIL_TESTER:-$MAIL_TESTER_DEFAULT}}"
HOST="${VPS_HOST:-root@186.246.2.104}"

if [[ -z "$MAIL_TESTER" ]]; then
  echo "Usage: bash scripts/vps/run-mail-helo-limited-verify.sh test-xxxxx@mail-tester.com"
  echo "Получите адрес на https://www.mail-tester.com/ и передайте его аргументом."
  exit 1
fi

echo "mail-tester → ${MAIL_TESTER}"

echo "=== 1/4 DNS (A + PTR) ==="
bash "${ROOT}/scripts/vps/verify-mail-helo-dns.sh"

echo ""
echo "=== 2/4 VPS hostname + EHLO ==="
ssh "${HOST}" bash -s <<'REMOTE'
set -euo pipefail
echo "hostname -f: $(hostname -f)"
grep -E '127\.0\.1\.1|zeip' /etc/hosts || true
docker inspect supabase-auth --format 'auth hostname={{.Config.Hostname}}' 2>/dev/null || echo "supabase-auth not found"
docker exec app-web printenv SMTP_HELO_NAME 2>/dev/null || echo "SMTP_HELO_NAME not set in app-web"
REMOTE

echo ""
echo "=== 3/4 Одно письмо → mail-tester (swaks на VPS) ==="
ssh "${HOST}" "bash /root/zeip/my-app/scripts/vps/run-swaks-on-vps.sh '${MAIL_TESTER}'"

echo ""
echo "Откройте mail-tester.com → Check your score (цель ≥ 9/10)."
echo "В Received/HELO не должно быть twc1.net — ожидается mail.zeip.ru."

if [[ -n "${YANDEX:-}" ]]; then
  echo ""
  echo "=== 4a Yandex (одно письмо) ==="
  ssh "${HOST}" "bash /root/zeip/my-app/scripts/vps/run-swaks-on-vps.sh '${YANDEX}'"
fi

if [[ -n "${MAILRU:-}" ]]; then
  echo ""
  echo "=== 4b Mail.ru (одно письмо) ==="
  ssh "${HOST}" "bash /root/zeip/my-app/scripts/vps/run-swaks-on-vps.sh '${MAILRU}'"
fi

if [[ -n "${GMAIL:-}" ]]; then
  echo ""
  echo "=== 4c Gmail (одно письмо) ==="
  ssh "${HOST}" "bash /root/zeip/my-app/scripts/vps/run-swaks-on-vps.sh '${GMAIL}'"
fi

echo ""
echo "Recovery через UI (не swaks): https://zeip.ru/auth → Забыли пароль? → vova1992_92@mail.ru"
echo "При reject — запросите у Timeweb лог с H=(mail.zeip.ru) без smtp-spam."
