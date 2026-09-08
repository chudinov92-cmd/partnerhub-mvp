#!/usr/bin/env bash
# Деплой OTP-only шаблонов recovery.html + confirm.html на VPS + recreate auth (inline, без git pull).
# Папка на Mac:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#   bash scripts/vps/run-deploy-recovery-template-remote.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST="${VPS_HOST:-root@186.246.2.104}"
TEMPLATES_DIR="${ROOT}/deploy/timeweb/supabase/email-templates"
RECOVERY="${TEMPLATES_DIR}/recovery.html"
CONFIRM="${TEMPLATES_DIR}/confirm.html"

for f in "$RECOVERY" "$CONFIRM"; do
  if [[ ! -f "$f" ]]; then
    echo "Error: $f not found"
    exit 1
  fi
done

cd "$ROOT"

echo "=== SSH: deploy recovery.html + confirm.html + recreate auth ==="
{
  echo 'set -euo pipefail'
  echo 'STACK=/root/zeip/supabase-stack'
  echo 'mkdir -p "$STACK/volumes/templates"'
  echo 'cat > "$STACK/volumes/templates/recovery.html" << '\''RECOVERY_EOF'\'''
  cat "$RECOVERY"
  echo 'RECOVERY_EOF'
  echo 'cat > "$STACK/volumes/templates/confirm.html" << '\''CONFIRM_EOF'\'''
  cat "$CONFIRM"
  echo 'CONFIRM_EOF'
  cat << 'REMOTE'
echo "=== recovery.html on VPS (first 5 lines) ==="
head -5 "$STACK/volumes/templates/recovery.html"
echo "=== confirm.html on VPS (first 5 lines) ==="
head -5 "$STACK/volumes/templates/confirm.html"
cd "$STACK"
docker compose up -d --force-recreate --no-deps templates-server auth
sleep 3
echo "=== recovery template (no links check) ==="
docker run --rm --network "container:supabase-auth" curlimages/curl:8.5.0 \
  -sf --max-time 8 http://templates-server/recovery.html | head -5
if docker run --rm --network "container:supabase-auth" curlimages/curl:8.5.0 \
  -sf --max-time 8 http://templates-server/recovery.html | grep -q '<a href'; then
  echo "WARN: recovery.html still contains <a href"
else
  echo "OK: recovery.html has no anchor links"
fi
echo "=== confirm template ==="
docker run --rm --network "container:supabase-auth" curlimages/curl:8.5.0 \
  -sf --max-time 8 http://templates-server/confirm.html | head -5
echo "=== auth recreated ==="
REMOTE
} | ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "$HOST" "bash -s"
