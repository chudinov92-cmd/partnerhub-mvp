#!/usr/bin/env bash
# Добавляет HSTS, X-Frame-Options и прокидывает IP клиента в supabase.zeip.ru.
#
# Запуск на VPS:
#   cd /root/zeip/my-app && bash scripts/vps/apply-caddy-security-headers.sh
#
# С Mac:
#   cd /Users/vladimirchudinov/Desktop/my-startup/my-app && bash scripts/vps/run-apply-caddy-security-headers-remote.sh
set -euo pipefail

CADDYFILE="${CADDYFILE:-/etc/caddy/Caddyfile}"

if [[ ! -f "${CADDYFILE}" ]]; then
  echo "ОШИБКА: нет ${CADDYFILE}"
  exit 1
fi

if grep -q 'Strict-Transport-Security' "${CADDYFILE}"; then
  echo "HSTS уже есть в ${CADDYFILE}"
else
  echo "=== Патч security headers в ${CADDYFILE} ==="
  CADDYFILE="${CADDYFILE}" python3 <<'PY'
from pathlib import Path
import re
import os

path = Path(os.environ["CADDYFILE"])
text = path.read_text()

snippet = """
(common_security_headers) {
  header {
    Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
    X-Frame-Options "DENY"
    X-Content-Type-Options "nosniff"
    Referrer-Policy "strict-origin-when-cross-origin"
  }
}

"""

if "(common_security_headers)" not in text:
    text = snippet + text.lstrip()

def inject_import(block: str) -> str:
    if "import common_security_headers" in block:
        return block
    m = re.match(r"(\s*\{)\s*\n", block)
    if not m:
        return block
    brace = m.group(1)
    rest = block[m.end() :]
    return f"{brace}\n  import common_security_headers\n{rest}"

# Site blocks: name { ... }
pattern = re.compile(
    r"^([^\s#][^\n{]*)\s*\{",
    re.MULTILINE,
)
starts = [m.start() for m in pattern.finditer(text)]
if not starts:
    raise SystemExit("Не найдено ни одного site-блока в Caddyfile")

blocks: list[tuple[int, int, str]] = []
for i, start in enumerate(starts):
    end = starts[i + 1] if i + 1 < len(starts) else len(text)
    header = text[start:end]
    name = header.split("{", 1)[0].strip()
    if name.startswith("(common_security_headers)"):
        continue
    blocks.append((start, end, name))

out = text
offset = 0
for start, end, name in blocks:
    block = text[start:end]
    if name.startswith("("):
        continue
    new_block = inject_import(block)
    if new_block != block:
        s = start + offset
        e = end + offset
        out = out[:s] + new_block + out[e:]
        offset += len(new_block) - len(block)

text = out

supabase_proxy = """reverse_proxy 127.0.0.1:8000 {
    header_up X-Forwarded-For {http.request.header.X-Forwarded-For}
    header_up X-Real-IP {remote_host}
  }"""

if "supabase.zeip.ru" in text:
    text = re.sub(
        r"reverse_proxy\s+127\.0\.0\.1:8000\s*\n",
        supabase_proxy + "\n",
        text,
        count=1,
    )
    text = re.sub(
        r"reverse_proxy\s+127\.0\.0\.1:8443\s*\n",
        supabase_proxy + "\n",
        text,
    )

path.write_text(text)
print("Caddyfile patched")
PY
fi

if ! grep -q 'header_up X-Real-IP' "${CADDYFILE}"; then
  echo "=== Патч supabase reverse_proxy (X-Forwarded-For / X-Real-IP) ==="
  CADDYFILE="${CADDYFILE}" python3 <<'PY'
from pathlib import Path
import os
import re

path = Path(os.environ["CADDYFILE"])
text = path.read_text()
supabase_proxy = """reverse_proxy 127.0.0.1:8000 {
    header_up X-Forwarded-For {http.request.header.X-Forwarded-For}
    header_up X-Real-IP {remote_host}
  }"""
if "supabase.zeip.ru" in text:
    text = re.sub(
        r"reverse_proxy\s+127\.0\.0\.1:8000\s*\n",
        supabase_proxy + "\n",
        text,
        count=1,
    )
    text = re.sub(
        r"reverse_proxy\s+127\.0\.0\.1:8443\s*\n",
        supabase_proxy + "\n",
        text,
    )
    path.write_text(text)
    print("supabase proxy patched")
PY
fi

caddy validate --config "${CADDYFILE}"
systemctl reload caddy
echo "Caddy перезагружен."

echo "Проверка заголовков:"
curl -sI https://zeip.ru | grep -iE 'strict-transport|x-frame' || true
curl -sI https://supabase.zeip.ru/auth/v1/health | grep -iE 'strict-transport|x-frame' || true

echo "Готово."
