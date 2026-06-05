#!/usr/bin/env bash
# Полный цикл плана очистки диска Zeip на VPS (Timeweb).
# Запуск на сервере:
#   cd /root/zeip/my-app && bash scripts/vps/zeip-disk-cleanup-plan.sh
# С Mac (интерактивный SSH с паролем):
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#   ssh root@186.246.2.104 'bash -s' < scripts/vps/zeip-disk-cleanup-plan.sh
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/root/zeip/my-app}"
MAINT="${REPO_ROOT}/scripts/migration/timeweb_disk_maintenance.sh"
BACKUP_DIR="${BACKUP_DIR:-/root/zeip/backups/daily}"
REPORT_DIR="${REPORT_DIR:-/root/zeip/backups/daily}"
REPORT_FILE="${REPORT_DIR}/disk-cleanup-$(date +%F_%H-%M-%S).log"

log() { echo "[$(date +%H:%M:%S)] $*"; }

df_line() { df -h / | tail -1; }

apply_docker_log_limits() {
  local frag='{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}'
  if [[ ! -f /etc/docker/daemon.json ]]; then
    echo "$frag" > /etc/docker/daemon.json
    log "Создан /etc/docker/daemon.json с лимитами логов"
    return 0
  fi
  if grep -q 'max-size' /etc/docker/daemon.json 2>/dev/null; then
    log "Лимиты логов уже есть в daemon.json — пропуск"
    return 0
  fi
  cp -a /etc/docker/daemon.json "/etc/docker/daemon.json.bak.$(date +%s)"
  log "ВНИМАНИЕ: daemon.json существует без max-size — объедините вручную (см. deploy/timeweb/docker-daemon-log-limits.fragment.json)"
  return 1
}

restart_stacks_if_docker_restarted() {
  local restarted="${1:-0}"
  [[ "$restarted" != "1" ]] && return 0
  log "Перезапуск compose-стеков..."
  if [[ -d /root/zeip/supabase-stack ]]; then
    (cd /root/zeip/supabase-stack && docker compose up -d) || true
  fi
  if [[ -f /root/zeip/my-app/deploy/timeweb/docker-compose.app.yml ]]; then
    (cd /root/zeip/my-app/deploy/timeweb && docker compose --env-file .env.app -f docker-compose.app.yml up -d) || true
  fi
}

choose_backup_keep() {
  local dir="$1"
  local count=0 total_kb=0 avg_mb=0
  count="$(find "$dir" -maxdepth 1 -type f -name 'supabase_*.dump' 2>/dev/null | wc -l | tr -d ' ')"
  if [[ "$count" -eq 0 ]]; then
    echo "14"
    return
  fi
  total_kb="$(find "$dir" -maxdepth 1 -type f -name 'supabase_*.dump' -printf '%s\n' 2>/dev/null | awk '{s+=$1} END {print int(s/1024)}')"
  avg_mb=$(( total_kb / count / 1024 ))
  log "Бэкапы: count=$count, суммарно ~$(( total_kb / 1024 )) MiB, средний ~${avg_mb} MiB"
  if [[ "$count" -gt 14 ]] || [[ "$total_kb" -gt 5120000 ]]; then
    echo "7"
  else
    echo "14"
  fi
}

maybe_remove_legacy_app_dir() {
  local legacy="/root/zeip/app"
  local current="/root/zeip/my-app"
  if [[ ! -d "$legacy" ]]; then
    log "Нет $legacy — пропуск dedup"
    return 0
  fi
  local leg_mb cur_mb
  leg_mb="$(du -sm "$legacy" 2>/dev/null | awk '{print $1}')"
  cur_mb="$(du -sm "$current" 2>/dev/null | awk '{print $1}')"
  log "/root/zeip/app ≈ ${leg_mb} MiB, my-app ≈ ${cur_mb} MiB"
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^app-web$'; then
    local img
    img="$(docker inspect app-web --format '{{.Config.Image}}' 2>/dev/null || true)"
    log "app-web image: $img"
  fi
  if grep -r '/root/zeip/app' /etc/cron* /var/spool/cron 2>/dev/null | grep -v '^#'; then
    log "cron ссылается на /root/zeip/app — НЕ удаляем"
    return 0
  fi
  if [[ -d "$current" ]] && [[ "${leg_mb:-0}" -gt 50 ]]; then
    log "Удаление устаревшего клона: $legacy"
    rm -rf "$legacy"
    log "Удалён $legacy"
  else
    log "legacy app не удалён (малый размер или нет my-app)"
  fi
}

truncate_large_backup_log() {
  local f="${BACKUP_DIR}/backup.log"
  if [[ -f "$f" ]]; then
    local sz
    sz="$(stat -c%s "$f" 2>/dev/null || echo 0)"
    if [[ "$sz" -gt 52428800 ]]; then
      log "truncate backup.log (>50 MiB)"
      truncate -s 0 "$f"
    fi
  fi
}

main() {
  mkdir -p "$REPORT_DIR"
  exec > >(tee -a "$REPORT_FILE") 2>&1

  log "=== Zeip disk cleanup plan ==="
  log "BEFORE: $(df_line)"

  if [[ ! -x "$MAINT" ]]; then
    chmod +x "$MAINT" 2>/dev/null || true
  fi
  if [[ ! -f "$MAINT" ]]; then
    echo "ОШИБКА: нет $MAINT — выполните git pull в $REPO_ROOT"
    exit 1
  fi

  log "--- diagnose ---"
  bash "$MAINT" diagnose || true

  log "--- docker-prune ---"
  bash "$MAINT" docker-prune || true

  log "--- system-cleanup ---"
  bash "$MAINT" system-cleanup || true

  local keep
  keep="$(choose_backup_keep "$BACKUP_DIR")"
  log "--- rotate-backups (KEEP=$keep) ---"
  bash "$MAINT" rotate-backups "$BACKUP_DIR" "$keep" || true

  truncate_large_backup_log

  local docker_restarted=0
  if apply_docker_log_limits || true; then
    if systemctl restart docker 2>/dev/null; then
      docker_restarted=1
      sleep 3
    fi
  fi
  restart_stacks_if_docker_restarted "$docker_restarted"

  log "--- legacy /root/zeip/app ---"
  maybe_remove_legacy_app_dir || true

  log "--- cron backup line ---"
  crontab -l 2>/dev/null | grep backup_self_hosted || echo "(cron backup не найден)"

  log "AFTER: $(df_line)"
  log "Отчёт: $REPORT_FILE"
  docker system df 2>/dev/null || true
}

main "$@"
