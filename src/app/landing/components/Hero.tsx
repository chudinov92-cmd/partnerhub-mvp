import { ButtonLink } from "@/app/landing/components/Button";

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
            <span className="hero__brand">Zeip</span> — место, где твои идеи становятся реальностью.
          </h1>
          <p className="hero__subtitle">
            Хватит планировать в одиночку. Найди тех, кто готов включиться с тобой в работу над проектом и разделить
            твои амбиции — прямо в твоем квартале.
          </p>

          <ButtonLink href="/" aria-label="На карту" noiseImageUrl={assets.btnNoise}>
            На карту
          </ButtonLink>
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

