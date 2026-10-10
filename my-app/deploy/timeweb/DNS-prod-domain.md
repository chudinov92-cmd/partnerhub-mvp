# DNS для возврата на zeip.ru

**Папка:** панель DNS домена `zeip.ru` (Timeweb / регистратор).

## Добавить / восстановить

| Тип | Имя | Значение | TTL |
|-----|-----|----------|-----|
| A | `@` | `186.246.2.104` | 300 |
| A | `www` | `186.246.2.104` | 300 |

## Закрыть test.zeip.ru

Удалить запись A/AAAA для:

- `test`

Проверка с Mac:

```bash
dig +short zeip.ru A @8.8.8.8
dig +short www.zeip.ru A @8.8.8.8
dig +short test.zeip.ru A @8.8.8.8
```

Ожидание: `zeip.ru` и `www.zeip.ru` → `186.246.2.104`; `test.zeip.ru` — пусто.

## Вариант A — уже в SSH на VPS (`root@186.246.2.104`)

```bash
cd /root/zeip/my-app
git pull --ff-only
bash scripts/vps/migrate-to-prod-domain.sh
bash deploy/timeweb/deploy-app.sh
```

## Вариант B — с Mac (одна команда, сам подключится по SSH)

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
bash scripts/vps/run-migrate-prod-domain-remote.sh
```

> Не смешивайте пути: `/Users/vladimirchudinov/...` — только на Mac, `/root/zeip/my-app` — только на VPS.
