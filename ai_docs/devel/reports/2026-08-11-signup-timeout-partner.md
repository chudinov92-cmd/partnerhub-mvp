# Регистрация: таймаут у партнёра (2026-08-11)

## Инцидент

Партнёр (Данис, `d.gab88@mail.ru`) на `https://zeip.ru/auth` при регистрации увидел:

> Сервис авторизации не отвечает. Проверьте интернет и попробуйте ещё раз через минуту.

## Диагностика

| Проверка | Результат |
|----------|-----------|
| `POST /auth/v1/signup` (curl) | **~0.7 s**, HTTP 200, письмо уходит |
| Пользователь `d.gab88@mail.ru` в GoTrue | **нет** — запрос до сервера не дошёл |
| Текст ошибки в UI | `isAuthTimeoutError` — клиентский таймаут **15 s** на `signUp` |

**Причина:** `signUp` шёл через `createBrowserClient` (cookie + Web Lock). На mount страницы параллельно выполняется `getSession()` — при медленном refresh/login `signUp` **ждёт lock** и не успевает за 15 s. SMTP и GoTrue исправны.

См. также [2026-05-29-auth-hang-diagnosis.md](./2026-05-29-auth-hang-diagnosis.md).

## Исправление (код)

1. `supabaseAuthForms` — отдельный клиент без persistSession для `signUp` / `resetPasswordForEmail` (`supabaseClient.ts`).
2. `/auth` — регистрация и сброс пароля через `supabaseAuthForms`, не через cookie-клиент.
3. Текст ошибки при таймауте signup — «проверьте почту, письмо могло уйти».

## Действия после деплоя

Попросить партнёра **повторить регистрацию** на `https://zeip.ru/auth`.

Если снова ошибка — на VPS:

```bash
ssh root@186.246.2.104
cd /root/zeip/supabase-stack
docker compose logs auth --tail 200
bash /root/zeip/my-app/scripts/migration/check_smtp_env.sh /root/zeip/supabase-stack/.env
```
