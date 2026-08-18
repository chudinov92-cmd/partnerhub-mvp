"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  FREE_PLAN_FEATURES,
  FREE_PLAN_PIN_FEATURE,
  formatRub,
  PIN_COLOR_FREE,
  PIN_COLOR_PRO,
  PIN_COLOR_PRO_PLUS,
  PRO_PLAN_FEATURES,
  PRO_PLAN_PIN_FEATURE,
  PRO_PLUS_PLAN_FEATURES,
  PRO_PLUS_PLAN_PIN_FEATURE,
  SUBSCRIPTION_PRICING,
} from "@/lib/subscriptionPlans";
import { supabase } from "@/lib/supabaseClient";

function IconCheck() {
  return (
    <svg className="pricingCard__check" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PinDot({ color }: { color: string }) {
  return (
    <span
      className="pricingCard__pin"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}

type PlanCardProps = {
  name: string;
  tagline: string;
  price: ReactNode;
  borderColor: string;
  badge?: { label: string; bg: string; fg?: string };
  features: readonly string[];
  pinFeature: string;
  pinColor: string;
  ctaHref: string;
  ctaLabel: string;
};

function PlanCard({
  name,
  tagline,
  price,
  borderColor,
  badge,
  features,
  pinFeature,
  pinColor,
  ctaHref,
  ctaLabel,
}: PlanCardProps) {
  return (
    <article className="pricingCard" style={{ borderColor }}>
      {badge ? (
        <span
          className="pricingCard__badge"
          style={{ backgroundColor: badge.bg, color: badge.fg ?? "#111827" }}
        >
          {badge.label}
        </span>
      ) : null}
      <div className="pricingCard__head">
        <h3 className="pricingCard__name">{name}</h3>
        <p className="pricingCard__tagline">{tagline}</p>
        <p className="pricingCard__price">{price}</p>
      </div>
      <ul className="pricingCard__features">
        {features.map((item) => (
          <li key={item} className="pricingCard__feature">
            <IconCheck />
            <span>{item}</span>
          </li>
        ))}
        <li className="pricingCard__feature">
          <IconCheck />
          <span className="pricingCard__pinRow">
            {pinFeature}
            <PinDot color={pinColor} />
          </span>
        </li>
      </ul>
      <Link href={ctaHref} className="pricingCard__cta">
        {ctaLabel}
      </Link>
    </article>
  );
}

export function LandingPricing() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const resolveAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!cancelled) {
        setIsAuthenticated(Boolean(session?.user));
      }
    };

    void resolveAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const freeHref = isAuthenticated ? "/subscription" : "/auth?mode=signup";
  const paidHref = isAuthenticated
    ? "/subscription"
    : "/auth?mode=signup&redirect=/subscription";

  return (
    <section className="section section--pricing" aria-label="Тарифы">
      <div className="container">
        <h2 className="h2 h2--center h2--green pricing__title">Тарифы</h2>
        <p className="pricing__subtitle">
          Выберите тариф под ваши задачи. Годовая оплата — со скидкой 20% на странице подписки.
        </p>
        <div className="pricingGrid">
          <PlanCard
            name="Free"
            tagline="Знакомство с сетью"
            price={
              <>
                0 ₽<span className="pricingCard__period"> / мес</span>
              </>
            }
            borderColor={PIN_COLOR_FREE}
            features={FREE_PLAN_FEATURES}
            pinFeature={FREE_PLAN_PIN_FEATURE}
            pinColor={PIN_COLOR_FREE}
            ctaHref={freeHref}
            ctaLabel="Начать бесплатно"
          />
          <PlanCard
            name="Pro"
            tagline={SUBSCRIPTION_PRICING.pro.tagline}
            price={
              <>
                {formatRub(SUBSCRIPTION_PRICING.pro.monthly)}
                <span className="pricingCard__period"> / мес</span>
              </>
            }
            borderColor={PIN_COLOR_PRO}
            badge={{ label: "PRO", bg: PIN_COLOR_PRO }}
            features={PRO_PLAN_FEATURES}
            pinFeature={PRO_PLAN_PIN_FEATURE}
            pinColor={PIN_COLOR_PRO}
            ctaHref={paidHref}
            ctaLabel="Выбрать"
          />
          <PlanCard
            name="Pro+"
            tagline={SUBSCRIPTION_PRICING.pro_plus.tagline}
            price={
              <>
                {formatRub(SUBSCRIPTION_PRICING.pro_plus.monthly)}
                <span className="pricingCard__period"> / мес</span>
              </>
            }
            borderColor={PIN_COLOR_PRO_PLUS}
            badge={{ label: "PRO+", bg: PIN_COLOR_PRO_PLUS, fg: "#ffffff" }}
            features={PRO_PLUS_PLAN_FEATURES}
            pinFeature={PRO_PLUS_PLAN_PIN_FEATURE}
            pinColor={PIN_COLOR_PRO_PLUS}
            ctaHref={paidHref}
            ctaLabel="Выбрать"
          />
        </div>
      </div>
    </section>
  );
}
