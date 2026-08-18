"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/app/landing/components/Button";
import { isPaidGateMode } from "@/lib/accessMode";
import { resolveAuthedAppEntryPath } from "@/lib/authEntryPath";
import { supabase } from "@/lib/supabaseClient";

type HeroProps = {
  assets: {
    logo: string;
    glow: string;
    btnNoise: string;
  };
};

const GUEST_CTA = { href: "/auth?mode=signup", label: "Присоединиться", ariaLabel: "Присоединиться" };

export function Hero({ assets }: HeroProps) {
  const [cta, setCta] = useState(GUEST_CTA);

  useEffect(() => {
    let cancelled = false;

    const resolveCta = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session?.user) {
        setCta(GUEST_CTA);
        return;
      }

      const path = await resolveAuthedAppEntryPath(session.user.id);
      if (cancelled) return;

      if (path === "/map") {
        setCta({ href: "/map", label: "На карту", ariaLabel: "На карту" });
        return;
      }

      setCta({ href: "/onboarding", label: "Войти", ariaLabel: "Войти" });
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
          <img className="hero__logo" src={assets.logo} alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="hero__glow" src={assets.glow} alt="" />
        </div>
      </div>
    </header>
  );
}
