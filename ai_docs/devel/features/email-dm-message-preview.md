# Email о непрочитанном ЛС: превью сообщения и лимит 24ч на отправителя

## Проблема

Fallback-email о непрочитанном ЛС (когда нет push-подписки) не давал контекста:
только CTA «Открыть сообщения». Письма приходили каждые 24 часа суммарно на
получателя (`profiles.last_message_email_at`), поэтому при нескольких собеседниках
человек получал уведомления по несколько дней подряд.

## Решение

1. **Контент письма** — имя отправителя, его профессия (`role_title`, если
   указана) и текст последнего непрочитанного сообщения (обрезка до 200 символов
   + многоточие). Служебные сообщения (`__PROFILE_SHARE__`, апелляции) показываем
   как есть. Единственная кнопка — **«Открыть чат»** → `/map?chat=<peerProfileId>`.
2. **Лимит 24 часа на пару «получатель → отправитель»** вместо глобального:
   - новая таблица `public.message_email_log (profile_id, peer_profile_id, sent_at)`,
     PK `(profile_id, peer_profile_id)`;
   - условие в `get_profiles_for_message_email()`: пары, у которых нет записи в логе
     за последние 24 часа;
   - после успешной отправки роут делает `upsert` в лог.

## Затронутые файлы

| Файл | Что |
|---|---|
| `my-app/supabase/sql/2026-10-27-email-dm-message-preview.sql` | таблица-лог, новая версия RPC |
| `my-app/src/app/api/email/new-message/route.ts` | формовка письма, `upsert` в лог |
| `libs/notifications/src/lib/email/content.ts` | `escapeEmailHtml`, `truncateEmailText`, `messagePreviewHtml`, `extraHtml` в wrapper |
| `libs/notifications/src/index.ts` | экспорт новых функций |
| `my-app/deploy/timeweb/deploy-app.sh` | регистрация новой миграции |

## Заметки

- `profiles.last_message_email_at` больше не влияет на выборку (поле оставлено в
  БД для обратной совместимости).
- Новый HTML-блок письма экранирует пользовательский контент (имя, профессию,
  текст) через `escapeEmailHtml`.
- После наката миграции лог пуст — письма могут прийти сразу, это ожидаемо.
- При сознательно отменённом глобальном предохранителе человек с N активными
  собеседниками может получить до N писем в сутки (по одному на каждого).

## Проверка

- `npx nx build my-app` — проходит.
- RPC `get_profiles_for_message_email()` — в Supabase SQL Editor: вернуть строки с
  `sender_name`, `sender_role_title`, `message_content`.