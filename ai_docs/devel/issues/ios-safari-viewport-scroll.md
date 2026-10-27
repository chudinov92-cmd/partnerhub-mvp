# iOS Safari: сдвиг страницы на ~40px (серая полоса)

## Симптом

На iPhone Safari при взаимодействии с интерактивными элементами (дропдауны, скролл списков) страница сдвигается вверх на ~40px. Появляется серая полоса внизу экрана. `window.scrollY` становится 40.

## Корневая причина

`min-height: 100vh` в layout-обёртке. На iOS Safari **`100vh` больше видимого viewport** — включает область за адресной строкой (~40px). Это создаёт скрытый scrollable-контент, который momentum scroll или touch-взаимодействия могут «вытянуть».

### Почему стандартные CSS-решения не работают на iOS Safari

| Подход | Результат |
|---|---|
| `overflow: hidden` на html/body | Игнорируется — iOS скроллит собственный viewport, а не CSS overflow |
| `position: fixed` на body | Игнорируется при momentum scroll |
| `overscroll-behavior: none` | Не блокирует viewport-scroll на iOS |
| `min-height: 100dvh` вместо `100vh` | Помогает частично, но адресная строка динамически меняет dvh |
| `window.scrollTo(0,0)` в scroll-event | Игнорируется во время momentum (compositor thread) |
| `touchmove` + `preventDefault()` на document | Блокирует ВСЕ touch-взаимодействия включая карту и внутренний скролл |

## Рабочее решение

**`requestAnimationFrame` polling** + CSS подстраховка:

```typescript
function usePreventBodyScroll() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';

    let rafId: number;
    const poll = () => {
      if (window.scrollY !== 0) window.scrollTo(0, 0);
      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);

    return () => {
      cancelAnimationFrame(rafId);
      html.style.overflow = '';
      body.style.overflow = '';
      html.style.overscrollBehavior = '';
      body.style.overscrollBehavior = '';
    };
  }, []);
}
```

### Почему работает

rAF выполняется ~60 раз/сек на main thread. Даже если compositor-scroll сдвинет страницу, на следующем кадре `scrollTo(0,0)` откатит. Визуально пользователь не видит сдвига. Не влияет на `element.scrollTop` вложенных скроллируемых контейнеров (дропдауны, ленты, карта).

## Дополнительные iOS Safari проблемы с дропдаунами

### Клавиатура открывается при тапе на дропдаун

Если `<input>` появляется под пальцем при открытии дропдауна, iOS передаёт тот же тап на input → клавиатура открывается. `blur()` в `onFocus` не помогает — анимация клавиатуры стартует до JS.

**Решение — fake input паттерн**: на touch-устройствах рендерить `<div>` вместо `<input>`. При явном тапе на div — подменить на настоящий `<input>` и сфокусировать.

### Scroll chaining из вложенных списков

Momentum scroll из `overflow-y: auto` контейнера может «вытечь» в родитель.

**Решение**: `overscrollBehavior: 'contain'` на скроллируемом списке + `maxHeight: 'min(560px, 40vh)'` для гарантии скроллируемости.

## Где применено

- `my-app/src/app/map/page.tsx` — `usePreventBodyScroll()` в компоненте `Home`
- `my-app/src/components/select/` — `MobileSelectSheet` (top-anchor по `visualViewport`, не `justify-end`), `DesktopSelectMenu`, `SelectSearchField` (fake input + `overscroll-contain`)
- `my-app/src/components/ProfessionDropdown.tsx`, `CityDropdown.tsx`, `TopBarCitySelect.tsx` — без `autoFocus`; mobile sheet на `visualViewport`
- `my-app/src/app/layout.tsx` — `style={{ minHeight: '100dvh' }}` как дополнение к `min-h-screen`

## Когда применять на других страницах

Если страница должна быть **полноэкранной без скролла** (карта, дашборд, full-screen UI) — добавить `usePreventBodyScroll()`. Для страниц с естественным скроллом (about, landing, auth) — НЕ применять.
