#!/usr/bin/env bash
# Путь 2: полный сброс данных Postgres для self-hosted Supabase (docker compose).
# Запускать на VPS в каталоге со stack'ом (по умолчанию /root/zeip/supabase-stack).
#
# Терминал (VPS):
#   cd /root/zeip/supabase-stack
#   sudo bash /path/to/supabase-path2-reset-postgres.sh
# или скопируй скрипт на сервер и:
#   chmod +x supabase-path2-reset-postgres.sh
#   sudo FORCE=1 ./supabase-path2-reset-postgres.sh /root/zeip/supabase-stack
#
# FORCE=1 — без интерактивного подтверждения (опасно).
set -euo pipefail

STACK_DIR="${1:-${SUPABASE_STACK_DIR:-/root/zeip/supabase-stack}}"
FORCE="${FORCE:-0}"

dc() {
  if [[ "$(id -u)" -eq 0 ]]; then docker compose "$@"; else sudo docker compose "$@"; fi
}

dv() {
  if [[ "$(id -u)" -eq 0 ]]; then docker volume "$@"; else sudo docker volume "$@"; fi
}

rm_rf() {
  if [[ "$(id -u)" -eq 0 ]]; then rm -rf "$@"; else sudo rm -rf "$@"; fi
}

usage() {
  echo "Usage: FORCE=1 $0 [STACK_DIR]" >&2
  echo "  STACK_DIR по умолчанию: /root/zeip/supabase-stack" >&2
  echo "  FORCE=1 — удалить PGDATA без запроса YES" >&2
  exit 1
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker не найден в PATH" >&2
  exit 1
fi

cd "$STACK_DIR"

echo "==> [1/5] Остановка стека (каталог: $STACK_DIR)"
dc down

# Официальный self-hosted compose чаще всего монтирует данные сюда (относительно stack):
PGDATA_HOST="$STACK_DIR/volumes/db/data"

echo "==> [2/5] Ожидаемый путь PGDATA (bind mount): $PGDATA_HOST"

if [[ ! -d "$PGDATA_HOST" ]]; then
  echo "WARN: каталог не найден. Если данные в другом месте — удали вручную после:"
  echo "      docker inspect supabase-db --format '{{range .Mounts}}{{println .Type .Source \"->\" .Destination}}{{end}}'"
  echo "      (подними временно только db или смотри volumes: в docker-compose.yml)"
fi

if [[ -d "$PGDATA_HOST" ]]; then
  if [[ "$FORCE" != "1" ]]; then
    read -r -p "УДАЛИТЬ ВСЕ ДАННЫЕ Postgres в $PGDATA_HOST ? Введите YES: " ans
    if [[ "$ans" != "YES" ]]; then
      echo "Отменено."
      exit 1
    fi
  fi
  echo "==> [3/5] Удаление $PGDATA_HOST"
  rm_rf "$PGDATA_HOST"
else
  echo "==> [3/5] Пропуск удаления (каталога нет)"
fi

echo "==> [4/5] Удаление volume db-config (если есть; пересоздастся при старте)"
if dv ls -q | grep -qx 'supabase_db-config'; then
  dv rm supabase_db-config || true
else
  echo "     volume supabase_db-config не найден — ок"
fi

echo "==> [5/5] Запуск стека"
dc up -d

echo ""
echo "Готово. Проверка:"
echo "  cd $STACK_DIR && docker compose ps"
echo "  cd $STACK_DIR && docker compose logs --tail=100 analytics | grep -E '28P01|invalid_password|FATAL' || true"
echo "  ss -lntp | grep ':8000' || true"
