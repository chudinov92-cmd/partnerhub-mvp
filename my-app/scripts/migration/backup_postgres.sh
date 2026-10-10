#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <postgres_connection_url> <output_dump_file>"
  exit 1
fi

DB_URL="$1"
OUT_FILE="$2"

OUT_DIR="$(dirname "$OUT_FILE")"
mkdir -p "$OUT_DIR"

echo "Creating backup: $OUT_FILE"
pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --verbose \
  --file="$OUT_FILE" \
  "$DB_URL"

echo "Backup completed: $OUT_FILE"
