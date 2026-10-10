# Экран авторизации (`/auth`)

## Цель

Вход, регистрация и запрос **кода** на сброс пароля. Код: [`my-app/src/app/auth/page.tsx`](../../my-app/src/app/auth/page.tsx).

## Режимы

| Режим | Поля | Действие |
|---|---|---|
| **Вход** | Email, пароль | `POST /api/v1/auth/login` (BFF, cookie-сессия). Прямого `signInWithPassword` из браузера нет. |
| **Регистрация** | Имя, email, пароль, повтор пароля, 2 чекбокса согласий | `signUp` + OTP на email |
| **Забыли пароль** | Email | `resetPasswordForEmail` → редирект на `/auth/reset-password?email=` |

## OTP-подтверждение email

- После **успешной регистрации** сразу показывается блок ввода 6-значного кода (`verifyOtp type=signup`).
- На шаге кода **регистрации** чекбоксы согласий и кнопка «Зарегистрироваться» скрыты; блок OTP — сразу под полем «Введите пароль повторно» (после сообщений error/info).
- Кнопка подтверждения: **«Подтвердить»**, зелёная (`bg-[#009966]`), как «Зарегистрироваться».
- **«Отправить код ещё раз»** — под кнопкой «Подтвердить». **Disabled**, пока не истекла пауза 60 с / суточный лимит; под кнопкой обратный отсчёт («Повторно запросить код можно через 0:59»).
- Лимиты отправки (регистрация и сброс — общий счётчик, скользящие 24 ч): **60 с** между письмами на email, **4** письма на email, **8** на IP. Подробности: [auth-otp-rate-limit.md](../features/auth-otp-rate-limit.md).
- Лимит входа по паролю: **5** неудач на email / **15 мин**, **20** неудач на IP / **15 мин**. Подробности: [auth-login-rate-limit.md](../features/auth-login-rate-limit.md).
- При ошибке «подтвердите почту» на **входе** — resend + тот же блок OTP (после кнопки «Войти»).
- Тексты: «Код действует 10 минут», «Проверьте «Спам»».
- Resend: «Письмо с новым кодом отправлено»; **предыдущий код аннулируется** — действует только код из последнего письма (подсказка под кнопкой resend).
- Ошибка **verifyOtp** (неверный/устаревший код): «Код неверный или устарел…» — **не** «Не удалось отправить письмо» (это только для сбоев resend/signUp SMTP).

## Забыли пароль

- Кнопка **«Отправить код»** (не «ссылку»).
- После успешного `resetPasswordForEmail` — редирект на [`/auth/reset-password`](../../my-app/src/app/auth/reset-password/page.tsx) с `?email=` (prefill).
- Запрос кода и повтор с `/auth/reset-password` идут через [`/api/v1/auth/otp-send`](../../my-app/src/app/api/v1/auth/otp-send/route.ts) (лимиты 60 с / 4 на email / 8 на IP за 24 ч). Кнопка «Запросить новый код» на месте, без ухода на `/auth`, пока тикает пауза — disabled + отсчёт.

## Пароль

- Все поля пароля — компонент [`PasswordInput`](../../my-app/src/components/PasswordInput.tsx).
- **Регистрация**: второе поле «Введите пароль повторно»; проверка `password === passwordConfirm`.
- Минимальная длина: 6 символов.

## Связанные экраны

- Сброс пароля: [`/auth/reset-password`](../../my-app/src/app/auth/reset-password/page.tsx) — OTP по умолчанию, legacy `token_hash` поддерживается. Подробности: [password-recovery-email.md](../features/password-recovery-email.md).
- Смена пароля в настройках: [`/settings`](../../my-app/src/app/settings/page.tsx).

## Edge cases

- Переключение вкладок сбрасывает `passwordConfirm` и блок OTP.
- Кнопка «Зарегистрироваться» disabled без двух согласий.
- **Повторная регистрация на занятый email:** GoTrue `422` или anti-enumeration `200` без письма — UI предлагает вход, «Забыли пароль?», resend + OTP.
- При активной сессии `/auth` редиректит через [`authEntryPath.ts`](../../my-app/src/lib/authEntryPath.ts).
- E2E: `e2e/auth.spec.ts` — TC-1.1, TC-1.1b.

## Auth-письма

Шаблоны OTP-only (без ссылок): см. [password-recovery-email.md](../features/password-recovery-email.md), [auth-email-delivery.md](../issues/auth-email-delivery.md).
