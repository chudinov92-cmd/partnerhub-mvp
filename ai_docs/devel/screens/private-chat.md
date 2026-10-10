# Личный чат (ЛС) на `/map`

## Цель

Переписка один-на-один с пользователем или поддержкой. Компонент: [`my-app/src/app/map/components/ChatDialog.tsx`](../../my-app/src/app/map/components/ChatDialog.tsx). Монтируется из [`my-app/src/app/map/page.tsx`](../../my-app/src/app/map/page.tsx) при `activeChatUser`.

## Режимы раскладки

| Брейкпоинт | Поведение |
|---|---|
| **Мобилка** (`max-width: 1023px`, Tailwind `< lg`) | Fullscreen overlay: `fixed inset-x-0 top-0 bottom-0`, высота `100dvh` + инлайн `visualViewport` (`top`/`height`) при `isMobileLayout`. Список чатов, карта, лента и `MainMobileNav` скрываются (`hideMobileMainStack = !!activeChatUser`). |
| **Десктоп** (`≥ 1024px`, Tailwind `lg:`) | Плавающая панель справа: `right-[336px]`, `w-[min(48rem,...)]`, `h-[760px]`, скругление и тень. Колонки карты остаются видимыми. |

Флаг `isMobileLayout` синхронизируется через `matchMedia("(max-width: 1023px)")` в [`useMapPageController.ts`](../../my-app/src/app/map/hooks/useMapPageController.ts).

## Элементы

- Шапка: аватар/имя собеседника, кнопка закрытия.
- Область сообщений (скролл).
- Комposer: textarea + «Отправить»; на мобилке без `scrollComposerIntoView` (viewport следует за клавиатурой через `useVisualViewportLayout`).
- Free без права писать: янтарная плашка + Link «Оформить Pro» → `/subscription?reason=dm` (сохраняет pending-контекст собеседника для toast после оплаты).
- Поддержка: форма обращения вместо обычного composer при закрытом/новом тикете.

## Edge cases

- **Гидрация:** CSS-fallback `bottom-0 h-dvh` на корне окна, чтобы до срабатывания `matchMedia` панель не схлопывалась по контенту.
- **Профиль из чата:** `ProfilePreviewCard` поверх окна (`z-[1700]`) при `activeProfileOverlay`.
- **Неготовый профиль:** блок «Заполните город и профессию» вместо composer.

## Связанные файлы

- [`useMapPageController.ts`](../../my-app/src/app/map/hooks/useMapPageController.ts) — `hideMobileMainStack`, `isMobileLayout`
- [`ChatsColumn.tsx`](../../my-app/src/app/map/components/ChatsColumn.tsx) — список «Мои чаты»
- [`useMobileKeyboardInset.ts`](../../my-app/src/hooks/useMobileKeyboardInset.ts) — `useVisualViewportLayout`
