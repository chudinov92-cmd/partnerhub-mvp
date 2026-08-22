"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/app/landing/components/Button";
import { isPaidGateMode } from "@/lib/accessMode";
import {
  LANDING_GUEST_CTA,
  resolveLandingHeroCta,
  type LandingHeroCta,
} from "@/lib/authEntryPath";
import { supabase } from "@/lib/supabaseClient";
import {
  AUTH_OPERATION_TIMEOUT_MS,
  withAuthTimeout,
} from "@/services/authService";

type HeroProps = {
  assets: {
    logo: string;
    glow: string;
    btnNoise: string;
  };
};

export function Hero({ assets }: HeroProps) {
  const [cta, setCta] = useState<LandingHeroCta>(LANDING_GUEST_CTA);

  useEffect(() => {
    let cancelled = false;

    const resolveCta = async () => {
      try {
        const {
          data: { user },
          error,
        } = await withAuthTimeout(
          supabase.auth.getUser(),
          "getUser(hero)",
          AUTH_OPERATION_TIMEOUT_MS,
        );
        if (cancelled) return;

        if (error || !user) {
          if (error) {
            await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
          }
          setCta(LANDING_GUEST_CTA);
          return;
        }

        const next = await resolveLandingHeroCta(user.id);
        if (cancelled) return;

        if (next.signOutLocal) {
          await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
        }
        setCta({
          href: next.href,
          label: next.label,
          ariaLabel: next.ariaLabel,
        });
      } catch {
        if (!cancelled) setCta(LANDING_GUEST_CTA);
      }
    };

    void resolveCta();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="hero">
      <div className="container hero__grid">
        <div className="hero__copy">
          <h1 className="hero__title">
            <span className="hero__brand">ЗЕИП</span> — карта людей в твоём городе, готовых вместе делать проекты
          </h1>
          <p className="hero__subtitle">
            Один легко сдаётся. Найди тех, кто готов двигаться — и дело пойдёт.
          </p>

          {isPaidGateMode() ? (
            <p className="mt-3 text-sm text-slate-600">
              Карту смотреть бесплатно · участие от 249 ₽ / 30 дней
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ButtonLink
              href={cta.href}
              aria-label={cta.ariaLabel}
              noiseImageUrl={assets.btnNoise}
            >
              {cta.label}
            </ButtonLink>
          </div>
        </div>

        <div className="hero__art" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="hero__logo" src={assets.logo} alt="Зеип" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="hero__glow" src={assets.glow} alt="" />
        </div>
      </div>
    </header>
  );
}
