#!/usr/bin/env bash
# Применить настройки refresh-токена GoTrue на VPS Zeip.
# Запуск с Mac (нужен SSH-доступ):
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app && bash scripts/vps/fix-gotrue-refresh.sh

set -euo pipefail

VPS_HOST="${VPS_HOST:-root@186.246.2.104}"

ssh "$VPS_HOST" bash -s <<'REMOTE'
set -euo pipefail
cd /root/zeip/supabase-stack

echo "=== auth logs (refresh/errors) ==="
docker compose logs auth --tail 200 | grep -iE "refresh|token|panic|error" || true

echo "=== current auth env (before) ==="
docker inspect supabase-auth --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -E 'GOTRUE_JWT_EXP|REFRESH_TOKEN' || true

# Короткие имена в .env (как JWT_EXPIRY).
for kv in \
  REFRESH_TOKEN_ROTATION_ENABLED=true \
  REFRESH_TOKEN_REUSE_INTERVAL=10
do
  k="${kv%%=*}"
  if grep -q "^${k}=" .env; then
    sed -i "s|^${k}=.*|${kv}|" .env
  else
    echo "$kv" >> .env
  fi
done

echo "=== .env (refresh keys) ==="
grep -E '^REFRESH_TOKEN_' .env || true

# Без строк в docker-compose.yml переменные из .env не попадут в контейнер
# (аналогично JWT_EXPIRY → GOTRUE_JWT_EXP).
if ! grep -q 'GOTRUE_SECURITY_REFRESH_TOKEN_ROTATION_ENABLED' docker-compose.yml; then
  echo "=== patching docker-compose.yml (auth refresh env) ==="
  python3 <<'PY'
from pathlib import Path

path = Path("docker-compose.yml")
text = path.read_text()
needle = "GOTRUE_JWT_EXP"
if needle not in text:
    raise SystemExit("GOTRUE_JWT_EXP not found in docker-compose.yml — patch manually")

insert = (
    "      GOTRUE_SECURITY_REFRESH_TOKEN_ROTATION_ENABLED: "
    "${REFRESH_TOKEN_ROTATION_ENABLED:-true}\n"
    "      GOTRUE_SECURITY_REFRESH_TOKEN_REUSE_INTERVAL: "
    "${REFRESH_TOKEN_REUSE_INTERVAL:-10}\n"
)

lines = text.splitlines(keepends=True)
out: list[str] = []
patched = False
for line in lines:
    out.append(line)
    if not patched and needle in line:
        out.append(insert)
        patched = True

if not patched:
    raise SystemExit("Failed to patch docker-compose.yml")

path.write_text("".join(out))
print("docker-compose.yml patched")
PY
else
  echo "docker-compose.yml already has refresh token env mapping"
fi

docker compose up -d --force-recreate auth
docker compose restart kong

echo "=== applied auth env (after) ==="
docker inspect supabase-auth --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -E 'GOTRUE_JWT_EXP|REFRESH_TOKEN' || {
    echo "WARN: REFRESH_TOKEN vars still not in container — check docker-compose.yml auth.environment"
  }
REMOTE

echo "Done. Test refresh from Mac:"
echo 'curl -i -X POST "https://supabase.zeip.ru/auth/v1/token?grant_type=refresh_token" \'
echo '  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Content-Type: application/json" \'
echo '  -d "{\"refresh_token\":\"<refresh_token>\"}"'
