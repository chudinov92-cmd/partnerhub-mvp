"use client";

import { useMemo, useState } from "react";

type ShotGalleryProps = {
  shots: Array<{ src: string; alt?: string }>;
};

export function ShotGallery({ shots }: ShotGalleryProps) {
  const isMobile = typeof window !== "undefined" && window.matchMedia?.("(max-width: 1024px)").matches;
  const visible = useMemo(() => shots.slice(0, 3), [shots]);
  const [idx, setIdx] = useState(0);

  if (!isMobile) {
    return (
      <div className="shotGrid" aria-hidden="true">
        {visible.map((s, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} className="shotGrid__img" src={s.src} alt={s.alt ?? ""} />
        ))}
      </div>
    );
  }

  const canPrev = idx > 0;
  const canNext = idx < visible.length - 1;

  return (
    <div className="shotCarousel">
      <button
        type="button"
        className="shotCarousel__arrow shotCarousel__arrow--left"
        aria-label="Предыдущий скриншот"
        disabled={!canPrev}
        onClick={() => setIdx((v) => Math.max(0, v - 1))}
      >
        ‹
      </button>

      <div className="shotCarousel__viewport" aria-hidden="true">
        <div className="shotCarousel__track" style={{ transform: `translateX(${-idx * 100}%)` }}>
          {visible.map((s, i) => (
            <div key={i} className="shotCarousel__slide">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="shotCarousel__img" src={s.src} alt={s.alt ?? ""} />
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="shotCarousel__arrow shotCarousel__arrow--right"
        aria-label="Следующий скриншот"
        disabled={!canNext}
        onClick={() => setIdx((v) => Math.min(visible.length - 1, v + 1))}
      >
        ›
      </button>
    </div>
  );
}

