#!/usr/bin/env bash
# Inline: HTML recovery-like swaks test on VPS.
set -euo pipefail

EMAIL="${1:-}"
if [[ -z "$EMAIL" ]]; then
  echo "ERROR: email required"
  exit 1
fi

STACK_ENV="${STACK_ENV:-/root/zeip/supabase-stack/.env}"

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

SMTP_HOST="$(read_env GOTRUE_SMTP_HOST SMTP_HOST)"
SMTP_PORT="$(read_env GOTRUE_SMTP_PORT SMTP_PORT)"
SMTP_USER="$(read_env GOTRUE_SMTP_USER SMTP_USER)"
SMTP_PASS="$(read_env GOTRUE_SMTP_PASS SMTP_PASS)"
FROM="$(read_env GOTRUE_SMTP_ADMIN_EMAIL SMTP_ADMIN_EMAIL)"
SENDER="$(read_env GOTRUE_SMTP_SENDER_NAME SMTP_SENDER_NAME)"
SENDER="${SENDER:-Zeip}"

if ! command -v swaks >/dev/null 2>&1; then
  apt-get update -qq && apt-get install -y swaks
fi

TLS=(--tls-on-connect)
[[ "$SMTP_PORT" == "587" ]] && TLS=(--tls)

FAKE_HASH="test_token_hash_html_swaks_$(date +%s)"
LINK="https://zeip.ru/auth/reset-password?token_hash=${FAKE_HASH}&type=recovery"
HTML_FILE="/tmp/zeip-recovery-html-test.html"

cat > "$HTML_FILE" <<HTMLEOF
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Сброс пароля</title></head>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;">
  <p style="font-size:13px;color:#666;text-transform:uppercase;">Zeip</p>
  <h1 style="font-size:22px;">Сброс пароля</h1>
  <p>Вы запросили сброс пароля. Ссылка действует 1 час.</p>
  <p><a href="${LINK}" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;text-decoration:none;border-radius:8px;">Сбросить пароль</a></p>
  <p style="font-size:14px;color:#666;">Код: 123456</p>
  <p style="font-size:13px;color:#888;">HTML swaks test — не настоящая ссылка.</p>
</body>
</html>
HTMLEOF

echo "=== swaks HTML (recovery-like) → ${EMAIL} ==="
timeout 90 swaks --to "$EMAIL" \
  --from "$FROM" \
  --server "$SMTP_HOST" --port "$SMTP_PORT" \
  --auth LOGIN --auth-user "$SMTP_USER" --auth-password "$SMTP_PASS" \
  "${TLS[@]}" \
  --header "From: ${SENDER} <${FROM}>" \
  --header "Subject: Сброс пароля — Zeip (html test $(date +%H%M))" \
  --header "Content-Type: text/html; charset=UTF-8" \
  --data @"$HTML_FILE" \
  2>&1 | tee /tmp/zeip-swaks-html.log

echo ""
if grep -qE '250 (OK|Ok|ok)|250 2\.0\.0' /tmp/zeip-swaks-html.log 2>/dev/null; then
  echo "swaks HTML: 250 OK — проверьте почту (тема «html test»)"
else
  echo "swaks HTML: FAIL"
fi
