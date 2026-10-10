#!/usr/bin/env bash
# Общий HELO/EHLO для SMTP-клиентов Zeip (Timeweb relay).
# Использование: source "$(dirname "$0")/smtp-helo-common.sh"
#   HELO="$(resolve_smtp_helo "${ENV_FILE:-}")"
#   swaks ... --ehlo "$HELO"

SMTP_HELO_DEFAULT="${SMTP_HELO_DEFAULT:-mail.zeip.ru}"

resolve_smtp_helo() {
  local env_file="${1:-}"
  local val="${SMTP_HELO_NAME:-}"

  if [[ -z "$val" && -n "$env_file" && -f "$env_file" ]]; then
    val="$(grep "^SMTP_HELO_NAME=" "$env_file" 2>/dev/null | head -1 | cut -d= -f2- || true)"
    if [[ "$val" =~ ^\'.*\'$ ]]; then val="${val:1:-1}"; fi
    if [[ "$val" =~ ^\".*\"$ ]]; then val="${val:1:-1}"; fi
  fi

  printf '%s' "${val:-$SMTP_HELO_DEFAULT}"
}
