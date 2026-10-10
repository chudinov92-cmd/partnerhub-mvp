#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <target_postgres_connection_url> <input_dump_file>"
  exit 1
fi

TARGET_DB_URL="$1"
IN_FILE="$2"

if [[ ! -f "$IN_FILE" ]]; then
  echo "Dump file not found: $IN_FILE"
  exit 1
fi

echo "Restoring dump: $IN_FILE"
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --verbose \
  --dbname="$TARGET_DB_URL" \
  "$IN_FILE"

echo "Restore completed."
