"use client";

import { ButtonLink } from "@/app/landing/components/Button";
import { FigmaCircle } from "@/app/landing/components/FigmaCircle";

type CircleAssets = {
  frameSrc: string;
  strokeSrc: string;
  maskSrc: string;
  maskPosition: string;
  maskSize: string;
  sizePx: number;
};

type FinalCtaProps =
  | {
      flatImage: true;
      assets: {
        btnNoise: string;
        image: string;
      };
    }
  | {
      flatImage?: false;
      assets: {
        btnNoise: string;
        image: string;
        circle: CircleAssets;
      };
    };

export function FinalCta(props: FinalCtaProps) {
  const { assets } = props;
  const flat = props.flatImage === true;

  return (
    <section className="section section--darkCta" aria-label="Призыв к действию">
      <div className="container cta">
        <div className="cta__copy">
          <p className="cta__kicker">Воплоти свою идею.</p>
          <p className="cta__title">Создать свой профиль на карте возможностей.</p>
          {flat ? (
            <ButtonLink
              href="/auth"
              aria-label="Создать"
              size="lg"
              noiseImageUrl={assets.btnNoise}
              className="cta__btn cta__btn--desktop"
            >
              Создать
            </ButtonLink>
          ) : (
            <ButtonLink href="/auth" aria-label="Создать" size="lg" noiseImageUrl={assets.btnNoise}>
              Создать
            </ButtonLink>
          )}
        </div>
        <div className="cta__visual" aria-hidden="true">
          {flat ? (
            <div className="cta__visualStack">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={assets.image} alt="" className="cta__image" />
              <div className="cta__visualActions" aria-hidden="false">
                <ButtonLink href="/auth" aria-label="Создать" size="lg" noiseImageUrl={assets.btnNoise}>
                  Создать
                </ButtonLink>
              </div>
            </div>
          ) : (
            <FigmaCircle
              sizePx={(assets as any).circle.sizePx}
              maxWidth="min(637px, 42vw)"
              frameSrc={(assets as any).circle.frameSrc}
              strokeSrc={(assets as any).circle.strokeSrc}
              maskSrc={(assets as any).circle.maskSrc}
              photoSrc={assets.image}
              maskPosition={(assets as any).circle.maskPosition}
              maskSize={(assets as any).circle.maskSize}
            />
          )}
        </div>
      </div>
    </section>
  );
}

