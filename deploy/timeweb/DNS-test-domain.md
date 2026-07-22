# DNS для test.zeip.ru

**Папка:** панель DNS домена `zeip.ru` (Timeweb / регистратор).

## Добавить

| Тип | Имя | Значение | TTL |
|-----|-----|----------|-----|
| A | `test` | `186.246.2.104` | 300 |

## Закрыть zeip.ru

Удалить записи A/AAAA для:

- `@` (корень zeip.ru)
- `www`

Проверка с Mac:

```bash
dig +short test.zeip.ru A
dig +short zeip.ru A
```

Ожидание: `test.zeip.ru` → `186.246.2.104`, `zeip.ru` — пусто или NXDOMAIN.

После DNS — на VPS:

```bash
ssh root@186.246.2.104
bash /root/zeip/my-app/scripts/vps/migrate-to-test-domain.sh
cd /root/zeip/my-app && git pull --ff-only && bash deploy/timeweb/deploy-app.sh
```
