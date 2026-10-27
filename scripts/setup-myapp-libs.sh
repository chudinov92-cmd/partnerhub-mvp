#!/usr/bin/env bash
# Копирует библиотеки в my-app/node_modules/@my-startup как исходники (TS).
# Все библиотеки копируются как libs/<name> (исходный TS-код, без project.json),
# т.к. Next.js использует transpilePackages для их компиляции на лету.
# Nx сборка библиотек в dist/ — только для валидации/публикации.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APPS="$ROOT/my-app/node_modules/@my-startup"

mkdir -p "$APPS"

for lib in analytics auth chat hooks map-ui notifications profile subscription ui admin; do
  SRC="$ROOT/libs/$lib"
  DST="$APPS/$lib"

  if [ ! -d "$SRC" ]; then
    echo "WARNING: libs/$lib not found, skipping" >&2
    continue
  fi

  rm -rf "$DST"
  mkdir -p "$DST"

  # Копируем только нужные файлы: src, package.json, README, tsconfig*
  # Исключаем project.json (Nx-артефакт) и вложенные копии
  if [ -f "$SRC/package.json" ]; then
    cp "$SRC/package.json" "$DST/package.json"
  fi
  if [ -d "$SRC/src" ]; then
    cp -r "$SRC/src" "$DST/src"
  fi
  if [ -f "$SRC/README.md" ]; then
    cp "$SRC/README.md" "$DST/README.md"
  fi
  for tsc in tsconfig.json tsconfig.lib.json; do
    if [ -f "$SRC/$tsc" ]; then
      cp "$SRC/$tsc" "$DST/$tsc"
    fi
  done
done

echo "setup-myapp-libs: done"
