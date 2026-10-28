#!/usr/bin/env bash
# Полный цикл очистки диска для запуска в консоли Timeweb (VNC/SSH с паролем).
# Не требует git pull — встроена защита образа freemium-rollback.
#
# Подключение:
#   ssh root@186.246.2.104
# или вкладка «Консоль» в панели Timeweb Cloud.
#
# Папка на сервере:
#   cd /root/zeip/my-app
#   bash scripts/vps/zeip-disk-cleanup-console.sh
#
# С Mac (если есть пароль):
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#   VPS_SSH_PASSWORD='***' bash scripts/vps/run-zeip-disk-cleanup-remote.sh
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/root/zeip/my-app}"
BACKUP_DIR="${BACKUP_DIR:-/root/zeip/backups/daily}"
REPORT_DIR="${REPORT_DIR:-/root/zeip/backups/daily}"
REPORT_FILE="${REPORT_DIR}/disk-cleanup-$(date +%F_%H-%M-%S).log"
KEEPER="zeip-rollback-keeper"
ROLLBACK_TAG="timeweb-app-web:freemium-rollback"

log() { echo "[$(date +%H:%M:%S)] $*"; }
df_line() { df -h / | tail -1; }

protect_rollback_images() {
  docker rm -f "$KEEPER" 2>/dev/null || true
  if docker image inspect "$ROLLBACK_TAG" >/dev/null 2>&1; then
    log "protect-rollback: удерживаем $ROLLBACK_TAG"
    docker create --name "$KEEPER" "$ROLLBACK_TAG" >/dev/null
    return 0
  fi
  if docker image inspect timeweb-app-web:latest >/dev/null 2>&1; then
    log "protect-rollback: удерживаем timeweb-app-web:latest"
    docker create --name "$KEEPER" timeweb-app-web:latest >/dev/null
    return 0
  fi
  log "protect-rollback: образы отката не найдены"
}

release_rollback_keeper() {
  if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "$KEEPER"; then
    docker rm -f "$KEEPER" >/dev/null 2>&1 || true
    log "protect-rollback: контейнер $KEEPER удалён"
  fi
}

run_diagnose() {
  log "--- diagnose ---"
  echo "=== df -h ==="
  df -h || true
  echo
  echo "=== du /var/lib/docker /root/zeip ==="
  for d in /var/lib/docker /root/zeip; do
    [[ -d "$d" ]] || continue
    echo "--- $d ---"
    du -h --max-depth=2 "$d" 2>/dev/null | sort -rh | head -20 || true
  done
  echo
  docker system df -v 2>/dev/null || true
  echo
  docker images -a --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}" 2>/dev/null || true
  echo
  if [[ -d /var/lib/docker/volumes ]]; then
    echo "=== docker volumes (top 15) ==="
    du -sh /var/lib/docker/volumes/* 2>/dev/null | sort -rh | head -15 || true
  fi
  echo
  if [[ -d "$BACKUP_DIR" ]]; then
    echo "=== backups $BACKUP_DIR ==="
    du -sh "$BACKUP_DIR" 2>/dev/null || true
    ls -lhS "$BACKUP_DIR"/*.dump 2>/dev/null | head -10 || true
  fi
}

docker_prune_safe() {
  log "--- docker-prune (без volume prune) ---"
  protect_rollback_images
  mkdir -p "$BACKUP_DIR"
  if docker buildx prune -a -f >>"$BACKUP_DIR/builder-prune.log" 2>&1; then
    :
  else
    docker builder prune -a -f >>"$BACKUP_DIR/builder-prune.log" 2>&1 || true
  fi
  # image prune пока keeper держит freemium-rollback; system prune — после (он удалит stopped keeper)
  docker image prune -a -f
  docker system prune -f
  release_rollback_keeper
  docker system df 2>/dev/null || true
}

system_cleanup() {
  log "--- system-cleanup ---"
  if command -v apt-get >/dev/null 2>&1; then
    apt-get clean -y || apt clean -y || true
    DEBIAN_FRONTEND=noninteractive apt-get autoremove -y || true
  fi
  if command -v journalctl >/dev/null 2>&1; then
    journalctl --vacuum-size=100M || true
  fi
}

choose_backup_keep() {
  local dir="$1"
  local count total_kb
  count="$(find "$dir" -maxdepth 1 -type f -name 'supabase_*.dump' 2>/dev/null | wc -l | tr -d ' ')"
  [[ "$count" -eq 0 ]] && echo "14" && return
  total_kb="$(find "$dir" -maxdepth 1 -type f -name 'supabase_*.dump' -printf '%s\n' 2>/dev/null | awk '{s+=$1} END {print int(s/1024)}')"
  log "Бэкапы: count=$count, ~$(( total_kb / 1024 )) MiB"
  if [[ "$count" -gt 14 ]] || [[ "$total_kb" -gt 5120000 ]]; then
    echo "7"
  else
    echo "14"
  fi
}

rotate_backups() {
  local dir="$1" keep="$2"
  [[ -d "$dir" ]] || return 0
  local to_delete
  to_delete="$(mktemp)"
  find "$dir" -maxdepth 1 -type f -name '*.dump' -printf '%T@\t%p\n' 2>/dev/null \
    | sort -rn | awk -v k="$keep" -F'\t' 'NR > k {print $2}' >"$to_delete" || true
  while read -r f; do
    [[ -z "$f" ]] && continue
    log "Удаление дампа: $f"
    rm -f "$f"
  done <"$to_delete"
  rm -f "$to_delete"
}

apply_docker_log_limits() {
  if [[ -f /etc/docker/daemon.json ]] && grep -q 'max-size' /etc/docker/daemon.json 2>/dev/null; then
    log "Лимиты логов Docker уже настроены"
    return 1
  fi
  if [[ ! -f /etc/docker/daemon.json ]]; then
    cat > /etc/docker/daemon.json <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
JSON
    log "Создан /etc/docker/daemon.json"
    return 0
  fi
  log "WARN: объедините deploy/timeweb/docker-daemon-log-limits.fragment.json вручную"
  return 1
}

restart_stacks() {
  log "Перезапуск compose-стеков..."
  [[ -d /root/zeip/supabase-stack ]] && (cd /root/zeip/supabase-stack && docker compose up -d) || true
  [[ -f /root/zeip/my-app/deploy/timeweb/docker-compose.app.yml ]] && \
    (cd /root/zeip/my-app/deploy/timeweb && docker compose --env-file .env.app -f docker-compose.app.yml up -d) || true
}

maybe_remove_legacy_app_dir() {
  local legacy="/root/zeip/app" current="/root/zeip/my-app"
  [[ -d "$legacy" ]] || return 0
  if grep -r '/root/zeip/app' /etc/cron* /var/spool/cron 2>/dev/null | grep -qv '^#'; then
    log "cron ссылается на /root/zeip/app — не удаляем"
    return 0
  fi
  local leg_mb
  leg_mb="$(du -sm "$legacy" 2>/dev/null | awk '{print $1}')"
  if [[ -d "$current" ]] && [[ "${leg_mb:-0}" -gt 50 ]]; then
    log "Удаление устаревшего /root/zeip/app (~${leg_mb} MiB)"
    rm -rf "$legacy"
  fi
}

main() {
  mkdir -p "$REPORT_DIR"
  exec > >(tee -a "$REPORT_FILE") 2>&1

  log "=== Zeip disk cleanup (console) ==="
  log "BEFORE: $(df_line)"

  run_diagnose
  docker_prune_safe
  system_cleanup

  local keep
  keep="$(choose_backup_keep "$BACKUP_DIR")"
  log "--- rotate-backups KEEP=$keep ---"
  rotate_backups "$BACKUP_DIR" "$keep"

  if [[ -f "${BACKUP_DIR}/backup.log" ]]; then
    local sz
    sz="$(stat -c%s "${BACKUP_DIR}/backup.log" 2>/dev/null || echo 0)"
    if [[ "$sz" -gt 52428800 ]]; then
      truncate -s 0 "${BACKUP_DIR}/backup.log"
      log "truncate backup.log (>50 MiB)"
    fi
  fi

  local docker_restarted=0
  if apply_docker_log_limits; then
    if systemctl restart docker 2>/dev/null; then
      docker_restarted=1
      sleep 3
    fi
  fi
  [[ "$docker_restarted" == "1" ]] && restart_stacks

  maybe_remove_legacy_app_dir

  log "AFTER: $(df_line)"
  log "Отчёт: $REPORT_FILE"
  docker system df 2>/dev/null || true
  docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}' 2>/dev/null || true
}

main "$@"
