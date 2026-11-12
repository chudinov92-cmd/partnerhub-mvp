# Бизнес-логика Zeip

## 1. Карта специалистов (`PartnerMap`)

### Отображение пинов
- Компонент `PartnerMap` на базе **react-leaflet**, рендерится только на клиенте (`dynamic(..., { ssr: false })`).
- Маркеры из `locations` (координаты) + `profiles` (данные). Пин — `L.divIcon` 48×48, белая обводка 4px, внутри первая буква имени. Цвет по умолчанию: `#10B981`.
- **Z-order пинов**: focused → свой пин → совпадение профессии → тариф (Pro+ → Pro → Free) → непросмотренные → рейтинг.

### Обфускация координат
- Реальные `lat/lng` не показываются. Пин — в детерминированно-случайной позиции в радиусе ~250 м (`obfuscateLatLngWithinRadius`).

### Просмотренные пины
- Таблица `profile_views` с `viewed_content_updated_at`. Просмотренный = серая обводка, непросмотренный = белая.
- Пин снова «непросмотрен» при изменении `content_updated_at`.

### Фильтры
- Поиск по специалистам: профессия, отрасль/подотрасль, статус (в localStorage).
- Режимы: `?contacts=1` (только избранное), `?mapContacts=1` (фильтр только карты).
- Сортировка: Pro+ → Pro → Free → рейтинг. При поиске: основная профессия → тариф.

### Popup профиля
- Имя + онлайн, отрасль/должность, рейтинг. Кнопки: «Написать», «Добавить/Удалить контакт», «Заблокировать». Свой пин: «Мой профиль».

Подробнее: `ai_docs/devel/screens/contacts.md`, `my-app/docs/ai_context.md` §5.

## 2. Профили

### Поля
- Основные: `full_name`, `city`, `industry`, `subindustry`, `role_title`, `current_status`, `experience_years`, `skills`.
- **Фамилия (приватная)**: таблица `profile_private.last_name`, RLS — только владелец. Не показывается на карте/в чатах.

### Рейтинг (баллы)
- `rating_count` — целочисленные баллы. Начисление через триггеры:
  - +1 за заполненное поле (дельта при сохранении)
  - +1 за указанное гео (один раз)
  - +1 за сообщение (1 раз/день)
  - +1 за ответ на входящее (1 раз/день)

### Версия контента
- `content_updated_at` — меняется при изменении полей формы `/profile` и `profile_work`. НЕ меняется при смене города/пина, `last_seen_at`, рейтинге или Pro.

### Профессиональные блоки (Группа 2)
- `profile_work` — доп. профессии. В попапе карты и поиске с ранжированием по слоту.

Подробнее: `my-app/docs/ai_context.md` §2, `ai_docs/devel/features/profile-onboarding.md`.
## 3. Общий чат

### Комнаты по городам
- Ключ комнаты — `posts.city`. Сообщения фильтруются по выбранному в шапке городу (`SelectedCityContext`) или «Россия».
- Город чата независим от города профиля.

### Отправка
- Лимит: 1000 символов. Отправка по кнопке / Enter (Shift+Enter = перенос).
- **Pro+**: до 10 сообщений/сутки; **Free/Pro**: только чтение.

### Лента
- Загрузка 20 последних постов с фильтром по городу.
- Карточка: аватар (первая буква), имя + онлайн, бейдж профессии + лет, текст (200 символов + «Читать далее»).
- Новые сообщения — в начало (UI хранит 20). Маскирование мата через триггер (`mask_profanity`).

### Комментарии
- `post_comments`, до 1000 символов. Мат маскируется. RLS: authenticated.

### Удаление
- Автор может hard-delete свой пост (и ЛС). Чужие — нет. Подтверждение: `window.confirm`.

Подробнее: `my-app/docs/ai_context.md` §3, `ai_docs/devel/screens/contacts.md`.

## 4. Личные сообщения (ЛС)

### Механика
- Диалоги один-на-один. `messages` + `chats` / `chat_members`.
- **Unread**: по `chat_members.last_read_at`. RPC `get_dm_unread_counts`.

### Лимиты (paid_gate)
| Тариф | Лимит |
|-------|-------|
| Free | недоступны (PaywallDrawer) |
| Pro | до 10 собеседников/сутки |
| Pro+ | до 30 собеседников/сутки |

### Push-уведомления
- Web-push (VAPID) через `@my-startup/notifications/server`. Не доставляются при блоке.
- Realtime на `messages` + dispatch push через RPC (`http://172.17.0.1:3001`).

Подробнее: `ai_docs/devel/screens/private-chat.md`, `my-app/docs/ai_context.md` §4.

## 5. Подписки (Free / Pro / Pro+)

### Матрица тарифов
| Функция | Free | Pro (249₽/мес) | Pro+ (449₽/мес) |
|---------|------|----------------|-----------------|
| Просмотр профилей | до 5/сутки | без лимита | без лимита |
| Избранное | до 5 | без лимита | без лимита |
| Общий чат | только чтение | только чтение | до 10/сутки |
| ЛС | — | до 10/сутки | до 30/сутки |
| Цвет пина | зелёный | жёлтый | фиолетовый |

Годовые (−20%): Pro 2390₽, Pro+ 4310₽.

### Оплата (Robokassa)
- `POST /api/subscription/create-payment` → Robokassa.
- Webhook: проверка подписи Password2, RPC `apply_robokassa_payment`.
- Фискальный чек (54-ФЗ). Апгрейд Pro→Pro+ с доплатой.

### Paywall-воронка
- Free: PaywallDrawer при попытке написать / 6-й просмотр / 6-е избранное.
- Лимит 24ч на повторный показ того же intent.
- После оплаты — Aha toast на `/map?payment=success`. Trial скрыт.

Подробнее: `ai_docs/devel/features/subscription-pro.md`, `subscription-paid-access.md`.

## 6. Уведомления

- **Веб-пуши (VAPID)**: библиотека `@my-startup/notifications` (client + server subpath `./server`).
- **Email (SMTP Timeweb)**: Nodemailer, шаблоны: подтверждение, сброс, новое сообщение, модерация.
- **Триггеры**: push — после INSERT в messages; email — через cron и API-роуты.

Подробнее: `ai_docs/devel/features/notifications-library.md`.

## 7. Геолокация и города

- **Город на карте**: `localStorage.selected_city` (гости) или `profiles.city` (авторизованные).
- **IP-геолокация отменена** по 152-ФЗ; дефолт — «Россия».
- **Селектор города**: `TopBarCitySelect`, мобилка — bottom sheet.

Подробнее: `ai_docs/devel/features/ip-city-detection.md`, `city-onboarding.md`.