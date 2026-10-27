#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <source_postgres_connection_url> <target_postgres_connection_url>"
  exit 1
fi

SOURCE_DB_URL="$1"
TARGET_DB_URL="$2"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/verify_counts.sql"

if [[ ! -f "$SQL_FILE" ]]; then
  echo "SQL file not found: $SQL_FILE"
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

SRC_OUT="$TMP_DIR/source.csv"
TGT_OUT="$TMP_DIR/target.csv"

psql "$SOURCE_DB_URL" -A -F',' -f "$SQL_FILE" > "$SRC_OUT"
psql "$TARGET_DB_URL" -A -F',' -f "$SQL_FILE" > "$TGT_OUT"

echo "=== Source ==="
cat "$SRC_OUT"
echo
echo "=== Target ==="
cat "$TGT_OUT"
echo
echo "=== Diff (source vs target) ==="
if diff -u "$SRC_OUT" "$TGT_OUT"; then
  echo "No differences found."
else
  echo "Differences detected."
  exit 2
fi
