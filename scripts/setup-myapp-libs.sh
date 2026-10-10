#!/usr/bin/env bash
# Настраивает монорепо-зависимости в my-app/node_modules/@my-startup.
# Для библиотек с dist-компиляцией (chat, subscription) копирует dist (Turbopack-friendly),
# для остальных — исходники (transpilePackages в next.config.ts).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APPS="$ROOT/my-app/node_modules/@my-startup"

mkdir -p "$APPS"

# analytics, auth, hooks, ui — собираются как src (transpilePackages)
cp -r "$ROOT/libs/analytics" "$APPS/analytics"
cp -r "$ROOT/libs/auth" "$APPS/auth"
cp -r "$ROOT/libs/hooks" "$APPS/hooks"
cp -r "$ROOT/libs/ui" "$APPS/ui"

# chat, subscription — компилируются tsc в dist (Turbopack читает dist/*.js)
if [ -f "$ROOT/dist/libs/chat/package.json" ]; then
  rm -rf "$APPS/chat"
  cp -r "$ROOT/dist/libs/chat" "$APPS/chat"
  fix_pkg "$APPS/chat/package.json" 2>/dev/null || true
else
  cp -r "$ROOT/libs/chat" "$APPS/chat"
fi

if [ -f "$ROOT/dist/libs/subscription/package.json" ]; then
  rm -rf "$APPS/subscription"
  cp -r "$ROOT/dist/libs/subscription" "$APPS/subscription"
  fix_pkg "$APPS/subscription/package.json" 2>/dev/null || true
else
  cp -r "$ROOT/libs/subscription" "$APPS/subscription"
fi

# Зафиксировать exports для dist-версий: экстернально должны указывать на ./src/index.js
fix_pkg() {
  local pkg="$1"
  python3 - "$pkg" <<'PY'
import json, sys
path = sys.argv[1]
p = json.load(open(path))
p["main"] = "./src/index.js"
p["types"] = "./src/index.d.ts"
p["exports"] = { ".": { "import": "./src/index.js", "default": "./src/index.js" } }
json.dump(p, open(path, "w"), indent=2)
PY
}

echo "setup-myapp-libs: done"