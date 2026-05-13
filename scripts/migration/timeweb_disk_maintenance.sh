#!/usr/bin/env bash
# На сервере Timeweb: диагностика диска, очистка Docker, ротация бэкапов, подсказки по логам.
# Запуск с Mac (пример):
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
#   ssh root@YOUR_HOST 'bash -s' < scripts/migration/timeweb_disk_maintenance.sh diagnose
#
# На сервере:
#   cd /root/zeip/my-app
#   chmod +x scripts/migration/timeweb_disk_maintenance.sh
#   bash scripts/migration/timeweb_disk_maintenance.sh diagnose
#
set -euo pipefail

usage() {
  cat <<'EOF'
Использование:
  timeweb_disk_maintenance.sh diagnose
      — df, du (корень и /var/lib/docker), docker system df, образы, journald, apt cache,
        размер логов контейнеров, типичные каталоги бэкапов.

  timeweb_disk_maintenance.sh docker-prune
      — docker system prune -f, docker image prune -a -f, docker builder prune -a -f
      (удаляет неиспользуемые образы и build cache; работающие контейнеры не трогает).

  timeweb_disk_maintenance.sh rotate-backups [DIR] [KEEP]
      — оставить только KEEP последних *.dump в DIR (по умолчанию DIR=/root/zeip/backups/daily, KEEP=7).

  timeweb_disk_maintenance.sh print-log-limits-json
      — вывести фрагмент для /etc/docker/daemon.json (лимиты json-file логов).

  timeweb_disk_maintenance.sh system-cleanup
      — apt clean / autoremove (если есть apt), journalctl --vacuum-size=100M.
EOF
}

cmd_diagnose() {
  echo "=== df -h ==="
  df -h || true

  echo
  echo "=== du top-level (depth 2 under /) — может занять время ==="
  du -h --max-depth=2 / 2>/dev/null | sort -rh | head -35 || true

  echo
  echo "=== docker system df -v ==="
  docker system df -v 2>/dev/null || echo "(docker недоступен)"

  echo
  echo "=== docker images -a ==="
  docker images -a --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}" 2>/dev/null || true

  echo
  echo "=== docker volume ls ==="
  docker volume ls 2>/dev/null || true

  echo
  echo "=== /var/lib/docker/volumes (top 25) ==="
  if [[ -d /var/lib/docker/volumes ]]; then
    du -sh /var/lib/docker/volumes/* 2>/dev/null | sort -rh | head -25 || true
  else
    echo "(нет /var/lib/docker/volumes)"
  fi

  echo
  echo "=== container json logs (top 20) ==="
  if [[ -d /var/lib/docker/containers ]]; then
    du -sh /var/lib/docker/containers/*/*-json.log 2>/dev/null | sort -rh | head -20 || true
  fi

  echo
  echo "=== journalctl disk ==="
  journalctl --disk-usage 2>/dev/null || true

  echo
  echo "=== apt archives ==="
  du -sh /var/cache/apt/archives/ 2>/dev/null || echo "(нет apt cache или каталог)"

  echo
  echo "=== типичные бэкапы (если есть) ==="
  for d in \
    "/root/zeip/backups/daily" \
    "/root/zeip/my-app/backups" \
    "/root/zeip/app/backups"; do
    if [[ -d "$d" ]]; then
      echo "--- $d ---"
      du -sh "$d" 2>/dev/null || true
      ls -lhS "$d" 2>/dev/null | head -15 || true
    fi
  done

  echo
  echo "=== готово: diagnose ==="
}

cmd_docker_prune() {
  echo "Running docker system prune -f ..."
  docker system prune -f

  echo "Running docker image prune -a -f ..."
  docker image prune -a -f

  echo "Running docker builder prune -a -f ..."
  docker builder prune -a -f

  echo "=== после prune ==="
  docker system df 2>/dev/null || true
  df -h / | tail -1 || true
}

cmd_rotate_backups() {
  local dir="${1:-/root/zeip/backups/daily}"
  local keep="${2:-7}"
  if [[ ! -d "$dir" ]]; then
    echo "Каталог не найден: $dir"
    exit 1
  fi
  local count_before
  count_before="$(find "$dir" -maxdepth 1 -name '*.dump' -type f 2>/dev/null | wc -l | tr -d ' ')"
  echo "rotate-backups: $dir — файлов .dump до: $count_before, оставляем последние $keep (по времени изменения)"

  # GNU find: сортируем по mtime (новые первые), удаляем хвост
  local to_delete
  to_delete="$(mktemp)"
  find "$dir" -maxdepth 1 -type f -name '*.dump' -printf '%T@\t%p\n' 2>/dev/null \
    | sort -rn \
    | awk -v k="$keep" -F'\t' 'NR > k {print $2}' >"$to_delete" || true

  if [[ ! -s "$to_delete" ]]; then
    rm -f "$to_delete"
    echo "rotate-backups: нечего удалять."
    return 0
  fi

  while read -r f; do
    [[ -z "$f" ]] && continue
    echo "Удаление: $f"
    rm -f "$f"
  done <"$to_delete"
  rm -f "$to_delete"

  echo "rotate-backups: готово."
}

cmd_print_log_limits() {
  cat <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
JSON
  cat <<'NOTE'

Пример безопасного применения (на сервере, от root):

1) Сохраните текущую конфигурацию:
   cp -a /etc/docker/daemon.json /etc/docker/daemon.json.bak.$(date +%s) 2>/dev/null || true

2) Если файла daemon.json ещё нет — создайте с содержимым выше.
   Если файл уже есть — вручную объедините JSON (ключи не дублируйте).

3) Проверка и перезапуск:
   systemd-analyze verify 2>/dev/null || true
   systemctl restart docker

4) Пересоздайте контейнеры compose, чтобы лимиты логов применились к новым файлам лога:
   cd /root/zeip/supabase-stack && docker compose up -d
   cd /root/zeip/my-app/deploy/timeweb && docker compose --env-file .env.app -f docker-compose.app.yml up -d
   (или пути, как у вас на сервере)

Подробнее: deploy/timeweb/README-disk-maintenance.md
NOTE
}

cmd_system_cleanup() {
  if command -v apt-get >/dev/null 2>&1; then
    apt-get clean -y || apt clean -y || true
    DEBIAN_FRONTEND=noninteractive apt-get autoremove -y || true
  fi
  if command -v journalctl >/dev/null 2>&1; then
    journalctl --vacuum-size=100M || true
  fi
  echo "system-cleanup: готово."
}

main() {
  case "${1:-}" in
    diagnose) cmd_diagnose ;;
    docker-prune) cmd_docker_prune ;;
    rotate-backups) cmd_rotate_backups "${2:-}" "${3:-}" ;;
    print-log-limits-json) cmd_print_log_limits ;;
    system-cleanup) cmd_system_cleanup ;;
    -h|--help|help) usage ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
