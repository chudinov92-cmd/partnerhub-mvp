#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <supabase_stack_dir> [output_dir]"
  echo "Example: $0 /root/zeip/supabase-stack /root/zeip/backups/daily"
  exit 1
fi

STACK_DIR="$1"
OUT_DIR="${2:-/root/zeip/backups/daily}"
TS="$(date +%F_%H-%M-%S)"

if [[ ! -d "$STACK_DIR" ]]; then
  echo "Error: stack directory not found: $STACK_DIR"
  exit 1
fi

mkdir -p "$OUT_DIR"

POSTGRES_PASSWORD="$(
  docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' supabase-db \
    | sed -n 's/^POSTGRES_PASSWORD=//p' | head -n1
)"

if [[ -z "$POSTGRES_PASSWORD" ]]; then
  echo "Error: POSTGRES_PASSWORD not found in supabase-db env"
  exit 1
fi

OUT_FILE="$OUT_DIR/supabase_${TS}.dump"

echo "Creating self-hosted Supabase backup: $OUT_FILE"
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" supabase-db \
  pg_dump -U postgres -d postgres \
  --format=custom --no-owner --no-privileges \
  --file="/tmp/supabase_${TS}.dump"

docker cp "supabase-db:/tmp/supabase_${TS}.dump" "$OUT_FILE"
docker exec supabase-db rm -f "/tmp/supabase_${TS}.dump"

echo "Backup completed: $OUT_FILE"
