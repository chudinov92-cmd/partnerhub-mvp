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

После DNS — на VPS:

```bash
ssh root@186.246.2.104
bash /root/zeip/my-app/scripts/vps/migrate-to-prod-domain.sh
cd /root/zeip/my-app && bash deploy/timeweb/deploy-app.sh
```

Или с Mac:

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
bash scripts/vps/run-migrate-prod-domain-remote.sh
```
