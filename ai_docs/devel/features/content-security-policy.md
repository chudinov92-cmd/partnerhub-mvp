# Content-Security-Policy (защита от XSS)

## Цель

HTTP-заголовок `Content-Security-Policy` ограничивает источники скриптов, стилей, подключений и фреймов. Снижает риск исполнения вредоносного JS при XSS.

## Где реализовано

| Файл | Роль |
|------|------|
| `my-app/src/lib/csp.ts` | Сборка CSP, security headers, nonce |
| `my-app/src/lib/inlineScripts.ts` | Тексты inline-скриптов + sha256-хеши |
| `my-app/src/middleware.ts` | Nonce на каждый HTML-запрос, auth только на `/map`, `/admin`, `/payment/*` |
| `my-app/src/app/layout.tsx` | `headers()` + `dynamic = force-dynamic`, иначе static HTML без nonce и Chrome режет `/_next/static` из‑за `strict-dynamic` |
| `my-app/next.config.ts` | Fallback: nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy, HSTS (prod; пути вне matcher) |
| `my-app/deploy/timeweb/Caddyfile.example` | TLS-терминатор: HSTS, X-Frame-Options, nosniff (все хосты) |

Caddy **не** дублирует CSP — см. комментарий в `deploy/timeweb/Caddyfile.example`. HSTS и `X-Frame-Options` на Caddy и в Next — намеренное дублирование (defense in depth).

## Стратегия

- **Nonce**: middleware пишет CSP (с `'nonce-…'`) и на **request**, и на response. Next.js 16 берёт nonce из request `Content-Security-Policy` и ставит на `<script>` — одного `x-nonce` мало. Root layout: `headers()` + `dynamic = force-dynamic`, иначе static HTML без nonce: Chrome + `strict-dynamic` режет бандл, `/auth` уходит нативным GET на `/auth?`, вкладки не живут.
- **sha256** для фиксированных inline: recovery-редирект, JSON-LD.
- **`strict-dynamic`** — динамические `<script>` Метрики, VK Pixel, GA после nonced-бандла.
- **`style-src 'unsafe-inline'`** — React `style={{}}` (карта, layout).
- **`unsafe-eval`** — только `NODE_ENV=development`.

## Allowlist (основные origins)

| Директива | Origins |
|-----------|---------|
| script-src | `'self'`, nonce, blob, mc.yandex.ru/com, mc.webvisor.*, top-fwz1.mail.ru, googletagmanager.com |
| connect-src | `'self'`, `NEXT_PUBLIC_SUPABASE_URL`, wss того же хоста, maps.vk.com, tiles/events.maps.vk.com, аналитика |
| img-src | `'self'`, data:, blob:, аналитика, maps.vk.com |
| worker-src / child-src | `'self'`, blob: (mmr-gl, webvisor) |
| frame-src | `'self'`, mc.yandex.*, mc.webvisor.* |
| form-action | `'self'`, auth.robokassa.ru |

## Переменные окружения

| Переменная | Значение | Эффект |
|------------|----------|--------|
| `CSP_REPORT_ONLY=1` | включить | `Content-Security-Policy-Report-Only` вместо enforcing |
| `CSP_DISABLE_HSTS=1` | включить | не отдавать HSTS (отладка) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://supabase.zeip.ru` | попадает в `connect-src` |

## Проверка после деплоя

Папка на VPS: `/root/zeip/my-app`

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
bash scripts/vps/apply-caddy-security-headers.sh
curl -sI https://zeip.ru | grep -iE 'content-security-policy|strict-transport|x-frame'
curl -sI https://supabase.zeip.ru/auth/v1/health | grep -iE 'strict-transport|x-frame'
```

Локально:

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
npm run test:unit
npm run dev
```

DevTools → Network → документ `/` → заголовок CSP; Console без violations на `/`, `/auth`, `/map` (карта, cookie-consent → Метрика).

## Изменение inline-скриптов

1. Правка текста в `inlineScripts.ts`.
2. Пересчёт sha256: `node --import tsx --test src/lib/csp.test.ts` (тест упадёт — обновить `INLINE_SCRIPT_HASHES` в `csp.ts`).
3. Деплой.

Миграции Supabase **не нужны**.
