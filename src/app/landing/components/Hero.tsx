"use client";

import { ButtonLink } from "@/app/landing/components/Button";
import { isPaidGateMode } from "@/lib/accessMode";

type HeroProps = {
  assets: {
    logo: string;
    glow: string;
    btnNoise: string;
  };
};

export function Hero({ assets }: HeroProps) {
  return (
    <header className="hero">
      <div className="container hero__grid">
        <div className="hero__copy">
          <h1 className="hero__title">
            <span className="hero__brand">ЗЕИП</span> — карта людей в твоём городе, которые хотят делать проекты.
          </h1>
          <p className="hero__subtitle">
            Хватит планировать в одиночку. Найди тех, кто готов включиться с тобой в работу над проектом и разделить
            твои амбиции — прямо в твоём городе.
          </p>

          {isPaidGateMode() ? (
            <p className="mt-3 text-sm text-slate-600">
              Карту смотреть бесплатно · участие от 249 ₽ / 30 дней
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ButtonLink href="/map" aria-label="На карту" noiseImageUrl={assets.btnNoise}>
              На карту
            </ButtonLink>
            <a
              href="#how-it-works"
              className="inline-flex items-center text-sm font-medium text-slate-600 underline underline-offset-4 hover:text-slate-900"
            >
              Как это работает
            </a>
          </div>
        </div>

        <div className="hero__art" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="hero__logo" src={assets.logo} alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="hero__glow" src={assets.glow} alt="" />
        </div>
      </div>
    </header>
  );
}

