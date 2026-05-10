#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <supabase_env_file>"
  echo "Example: $0 /root/zeip/supabase-stack/.env"
  exit 1
fi

ENV_FILE="$1"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: env file not found: $ENV_FILE"
  exit 1
fi

echo "Checking SMTP config in: $ENV_FILE"

required_keys=(
  SMTP_HOST
  SMTP_PORT
  SMTP_USER
  SMTP_PASS
  SMTP_ADMIN_EMAIL
  SMTP_SENDER_NAME
  ENABLE_EMAIL_AUTOCONFIRM
)

missing=0
for key in "${required_keys[@]}"; do
  if ! grep -q "^${key}=" "$ENV_FILE"; then
    echo "Missing key: $key"
    missing=1
  fi
done

if grep -q 'ВСТАВЬ_' "$ENV_FILE"; then
  echo "Found placeholder values (ВСТАВЬ_*) in .env"
  missing=1
fi

if grep -q '^SMTP_PASS=fake_mail_password$' "$ENV_FILE"; then
  echo "Found fake SMTP password value"
  missing=1
fi

echo "Current SMTP-related lines:"
grep -n '^SMTP_\|^ENABLE_EMAIL_AUTOCONFIRM=' "$ENV_FILE" || true

if [[ "$missing" -eq 1 ]]; then
  echo "SMTP env check: FAILED"
  exit 1
fi

echo "SMTP env check: OK"
