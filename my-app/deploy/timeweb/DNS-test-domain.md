# DNS: test.zeip.ru параллельно prod

> **Режим:** `test.zeip.ru` работает **рядом** с `zeip.ru`, не вместо него.

**Папка:** панель DNS домена `zeip.ru` (Timeweb).

## Добавить / проверить

| Тип | Имя | Значение | TTL |
|-----|-----|----------|-----|
| A | `test` | `186.246.2.104` | 300 |
| A | `@` | `186.246.2.104` | 300 |
| A | `www` | `186.246.2.104` | 300 |

## Проверка с Mac

```bash
dig +short zeip.ru A @8.8.8.8
dig +short test.zeip.ru A @8.8.8.8
```

Ожидание: оба → `186.246.2.104`.

## VPS

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
git checkout paid-access && git pull --ff-only
bash scripts/vps/enable-parallel-test-domain.sh
bash deploy/timeweb/deploy-app-test.sh
```

См. также [`integrations-test-domain.md`](integrations-test-domain.md).
