# CSP — чеклист внедрения

## Реализация

- [x] `src/lib/csp.ts` — политика, nonce, security headers
- [x] `src/lib/inlineScripts.ts` — recovery + JSON-LD, хеши
- [x] `src/middleware.ts` — CSP на все HTML, auth только на защищённых путях
- [x] `src/lib/supabaseServer.ts` — сохранение `x-nonce` при refresh cookie
- [x] Unit-тест `src/lib/csp.test.ts`
- [x] Документ `ai_docs/devel/features/content-security-policy.md`

## Деплой на prod

- [ ] `bash scripts/vps/apply-caddy-security-headers.sh` (HSTS + X-Frame-Options на Caddy)
- [ ] (опционально) `CSP_REPORT_ONLY=1` в `deploy/timeweb/.env.app` на 1–2 недели
- [x] `bash deploy/timeweb/deploy-app.sh` из `/root/zeip/my-app` на VPS (`1ee8d06`, 16.09.2026)
- [x] `curl -sI https://zeip.ru | grep -iE 'content-security-policy|strict-transport|x-frame'`
- [x] Проверка: `/auth` — nonce на 12/12 chunk-скриптах, вкладка «Регистрация» переключается
- [x] Root layout: `force-dynamic` + request CSP nonce (фикс `/auth?` без гидрации)
- [ ] Убрать `CSP_REPORT_ONLY=1` → enforcing

## VPS

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
git pull --ff-only
bash deploy/timeweb/deploy-app.sh
```

Supabase SQL: **не требуется**.
