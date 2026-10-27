# Платный стенд test.zeip.ru (параллельно prod)

## DNS (Timeweb)

| Тип | Имя | Значение |
|-----|-----|----------|
| A | `test` | `186.246.2.104` |

`@` и `www` не трогать — prod на `zeip.ru`.

## VPS

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
git fetch && git checkout paid-access && git pull --ff-only
bash scripts/vps/enable-parallel-test-domain.sh
bash deploy/timeweb/deploy-app-test.sh
```

## Локальный worktree

```bash
cd "/Users/vladimirchudinov/Downloads/Zeip Paid"
```

## Проверка

```bash
curl -sI https://zeip.ru/ | head -3
curl -sI https://test.zeip.ru/ | head -3
cd "/Users/vladimirchudinov/Downloads/Zeip Paid"
bash scripts/migration/healthcheck_timeweb.sh "https://test.zeip.ru" "https://supabase.zeip.ru"
```

## Чеклист

- [ ] DNS A `test` → VPS
- [ ] Caddy: `zeip.ru` → :3001, `test.zeip.ru` → :3002
- [ ] GoTrue `ADDITIONAL_REDIRECT_URLS` включает test
- [ ] `.env.app.test` с `NEXT_PUBLIC_ACCESS_MODE=paid_gate`
- [ ] Robokassa test URLs на test.zeip.ru
- [ ] VK Maps: allowlist `test.zeip.ru`
