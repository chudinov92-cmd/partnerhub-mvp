# Диагностика зависания auth/карты (2026-05-29)

## Симптомы

- Карта на `/map` не загружала профили после возврата с `/` (лендинг).
- Страница `/auth` зависала на «Подождите...» при входе.
- В cookie был валидный access token, но `refresh_token` — битый seed (`hfh7dur7dc47`).

## Корневая причина (клиент)

`supabase-js` сериализует все операции одного браузерного клиента через `navigator.locks` (Web Locks API). Публичные запросы (`fetchProfilesForMap`, `fetchActiveLocations`) шли через тот же cookie-клиент, что и auth — при зависшем refresh/login они блокировались на локе.

## Диагностика шлюза `supabase.zeip.ru`

Проверка из каталога `my-app` (2026-05-29):

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app

# CORS preflight
curl -i -X OPTIONS 'https://supabase.zeip.ru/auth/v1/token?grant_type=password' \
  -H 'Origin: https://zeip.ru' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: authorization,apikey,content-type,x-client-info' \
  --max-time 15

# POST (неверный пароль)
curl -i -X POST 'https://supabase.zeip.ru/auth/v1/token?grant_type=password' \
  -H 'Content-Type: application/json' \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -d '{"email":"test@example.com","password":"wrong"}' \
  --max-time 20
```

**Результат (локально):**

| Запрос | HTTP | Время | Kong latency |
|--------|------|-------|--------------|
| OPTIONS | 200 | ~1.9 s | 2 ms |
| POST | 400 `invalid_credentials` | ~0.28 s | upstream 23 ms |

CORS-preflight и POST **не зависают** — шлюз отвечает корректно. Зависание в браузере объясняется Web Lock + отсутствием клиентских таймаутов на форме входа, а не постоянной недоступностью Kong/GoTrue.

**VPS:** SSH `root@186.246.2.104` из CI-агента недоступен (Permission denied). Для проверки на сервере:

```bash
ssh root@186.246.2.104
cd ~/zeip/supabase-stack
docker compose ps
docker compose logs auth --tail 100
docker compose logs kong --tail 100
```

## Исправления в коде

1. **`supabasePublic`** (`my-app/src/lib/supabaseClient.ts`) — отдельный anon-клиент без `persistSession`/`autoRefreshToken` для публичных read-запросов карты/ленты.
2. **`profileService.ts`** — `fetchProfilesForMap`, `fetchProfilesInterestedIn`, `fetchActiveLocations`, `fetchProfileLikeCount` переведены на `supabasePublic`.
3. **`auth/page.tsx`** — `signInWithPassword` / `signUp` / `resetPasswordForEmail` / `getSession` обёрнуты в `withAuthTimeout` (15 s / 8 s) с понятной ошибкой при таймауте.
4. **`authService.ts`** — экспорт `withAuthTimeout`, `AUTH_FORM_TIMEOUT_MS`, `isAuthTimeoutError`.

## Рекомендации по логам из браузера

Для отладки сетевых зависаний предпочтительнее **HAR (очищенный)** — видны статусы, тайминги, preflight. Экспорт fetch из DevTools без статусов/времени недостаточен для диагностики OPTIONS vs POST.

## Серверные действия (при повторении)

Если OPTIONS/POST снова начнут таймаутиться:

```bash
ssh root@186.246.2.104
cd ~/zeip/supabase-stack
docker compose restart auth kong
docker compose logs auth --tail 200
```
