#!/usr/bin/env bash
# Накатить SQL + GoTrue/Kong + деплой app (login brute-force 1–3).
# Запуск на VPS:
#   bash /root/zeip/my-app/scripts/vps/remote-auth-login-harden-body.sh
set -euo pipefail

cd /root/zeip/my-app
echo "=== git pull ==="
git pull --ff-only
git log -1 --oneline

echo "=== SQL auth_login_attempts ==="
docker exec -i supabase-db psql -U supabase_admin -d postgres \
  < supabase/sql/2026-09-16-auth-login-attempts.sql

echo "=== GoTrue + Kong rate limit ==="
bash scripts/vps/apply-gotrue-rate-limit.sh

echo "=== deploy app ==="
bash deploy/timeweb/deploy-app.sh

echo "=== verify headers ==="
curl -sI https://zeip.ru | grep -iE 'strict-transport|x-frame' || true

echo "=== verify BFF lockout (fake email) ==="
for i in 1 2 3 4 5 6; do
  code=$(curl -sS -o /tmp/login-try.json -w '%{http_code}' \
    -X POST http://127.0.0.1:3001/api/v1/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"harden-verify@example.com","password":"wrong-password-xyz"}')
  echo "$i -> HTTP $code $(cat /tmp/login-try.json)"
done
