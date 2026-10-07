"use client";

import { useEffect, useState } from "react";

export type VisualViewportLayout = {
  /** Смещение visual viewport сверху (Safari URL-bar и т.п.) */
  offsetTop: number;
  /** Высота видимой области */
  height: number;
  /** Перекрытие снизу клавиатурой */
  keyboardInset: number;
};

const defaultLayout = (): VisualViewportLayout => ({
  offsetTop: 0,
  height: typeof window !== "undefined" ? window.innerHeight : 0,
  keyboardInset: 0,
});

/**
 * Раскладка visualViewport для мобильной клавиатуры (iOS Safari / Chrome).
 */
export function useVisualViewportLayout(): VisualViewportLayout {
  const [layout, setLayout] = useState<VisualViewportLayout>(defaultLayout);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const keyboardInset = Math.max(
        0,
        window.innerHeight - vv.height - vv.offsetTop,
      );
      setLayout({
        offsetTop: Math.round(vv.offsetTop),
        height: Math.round(vv.height),
        keyboardInset: Math.round(keyboardInset),
      });
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return layout;
}

/** @deprecated Используйте useVisualViewportLayout().keyboardInset */
export function useMobileKeyboardInset(): number {
  return useVisualViewportLayout().keyboardInset;
}
