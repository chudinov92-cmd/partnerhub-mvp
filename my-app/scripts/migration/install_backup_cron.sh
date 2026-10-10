#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <project_root_on_server>"
  echo "Example: $0 /root/zeip/my-app"
  exit 1
fi

PROJECT_ROOT="$1"
STACK_DIR="/root/zeip/supabase-stack"
SCRIPT_PATH="$PROJECT_ROOT/scripts/migration/backup_self_hosted_supabase.sh"
LOG_DIR="/root/zeip/backups/daily"
LOG_FILE="$LOG_DIR/backup.log"

if [[ ! -x "$SCRIPT_PATH" ]]; then
  echo "Error: script is not executable or not found: $SCRIPT_PATH"
  echo "Run: chmod +x \"$SCRIPT_PATH\""
  exit 1
fi

mkdir -p "$LOG_DIR"

CRON_LINE="30 3 * * * \"$SCRIPT_PATH\" \"$STACK_DIR\" \"$LOG_DIR\" >> \"$LOG_FILE\" 2>&1"

(
  crontab -l 2>/dev/null | sed '/backup_self_hosted_supabase.sh/d'
  echo "$CRON_LINE"
) | crontab -

echo "Installed cron job:"
crontab -l | grep backup_self_hosted_supabase.sh
