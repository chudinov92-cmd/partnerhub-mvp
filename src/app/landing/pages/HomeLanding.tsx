"use client";

import Link from "next/link";
import { FeatureSplit } from "@/app/landing/components/FeatureSplit";
import { FinalCta } from "@/app/landing/components/FinalCta";
import { Hero } from "@/app/landing/components/Hero";
import { LandingPricing } from "@/app/landing/components/LandingPricing";
import { Mechanics } from "@/app/landing/components/Mechanics";
import { ShotGallery } from "@/app/landing/components/ShotGallery";
import { StatsBar } from "@/app/landing/components/StatsBar";
import type { PublicStats } from "@/services/statsPublicService";

const asset = (p: string) => `/assets/landing${p.startsWith("/") ? "" : "/"}${p}`;

type HomeLandingProps = {
  stats?: PublicStats | null;
};

export function HomeLanding({ stats = null }: HomeLandingProps) {
  const assets = {
    logo: asset("zeip-logo.png"),
    heroGlow: asset("hero-illustration.png"),
    btnNoise: asset("btn-noise.png"),
    profileShots: [
      asset("shot-profile-1.png"),
      asset("shot-profile-2.jpg"),
      asset("shot-profile-3.jpg"),
    ],
    mechanics: {
      pin: asset("mechanic-pin.svg"),
      map: asset("mechanic-map.svg"),
      send: asset("mechanic-send.svg"),
    },
  } as const;

  return (
    <div className="page">
      <Hero assets={{ logo: assets.logo, glow: assets.heroGlow, btnNoise: assets.btnNoise }} />

      <StatsBar stats={stats} />

      <main>
        <FeatureSplit
          title="Большие проекты не рождаются в вакууме."
          body="Твоя идея останется в голове, если не найти тех, кто поможет воплотить её в жизнь. Мы помогаем найти людей, готовых воплощать идеи в реальность здесь и сейчас."
          visual={
            // eslint-disable-next-line @next/next/no-img-element -- decorative landing art; skip next/image cache
            <img
              src={asset("lp-vacuum.png")}
              alt=""
              width={639}
              height={707}
              className="h-auto w-full max-w-[649px] object-contain"
            />
          }
        />

        <div id="how-it-works">
          <Mechanics
            title="Механика"
            items={[
              { iconSrc: assets.mechanics.pin, title: "Заяви о себе", text: "Заполни профиль и появись на карте" },
              { iconSrc: assets.mechanics.map, title: "Открой карту", text: "Найди нужных экспертов" },
              { iconSrc: assets.mechanics.send, title: "Начни строить", text: "Напиши и реши свою задачу уже сегодня" },
            ]}
          />
        </div>

        <FeatureSplit
          reverse
          title="Команда на расстоянии вытянутой руки."
          body="Тебе не нужно искать специалистов на другом конце страны, регистрироваться на форумах или создавать аккаунт на сервисах подбора сотрудников. Твой будущий партнер может пить кофе в кофейне за углом. Zeip сокращает дистанцию до минимума."
          visual={
            // eslint-disable-next-line @next/next/no-img-element -- decorative landing art; skip next/image cache
            <img
              src={asset("lp-team.png")}
              alt=""
              width={639}
              height={707}
              className="h-auto w-full max-w-[649px] object-contain"
            />
          }
        />

        <section className="section section--indigo" aria-label="Превью приложения">
          <div className="container">
            <ShotGallery
              shots={[
                { src: assets.profileShots[0], alt: "Профиль в Zeip" },
                { src: assets.profileShots[1], alt: "Профиль в Zeip" },
                { src: assets.profileShots[2], alt: "Профиль в Zeip" },
              ]}
            />
          </div>
        </section>

        <FeatureSplit
          title="От первого сообщения до общего проекта."
          body={
            "• Без объявлений;\n• Без резюме и откликов;\n• Без цен на услуги.\n\nПросто напиши «Привет, есть вопрос, можешь помочь?». Всё начинается с первого сообщения."
          }
          visual={
            // eslint-disable-next-line @next/next/no-img-element -- decorative landing art; skip next/image cache
            <img
              src={asset("lp-message.png")}
              alt=""
              width={639}
              height={707}
              className="h-auto w-full max-w-[649px] object-contain"
            />
          }
        />

        <FeatureSplit
          reverse
          title="Начни со своего двора, охвати всю страну."
          body="Если нужного профессионала не оказалось в твоём городе — просто расширь радиус поиска. Мы покажем тебе специалистов по всему городу и стране. Твои люди найдутся в любом масштабе."
          visual={
            // eslint-disable-next-line @next/next/no-img-element -- decorative landing art; skip next/image cache
            <img
              src={asset("lp-country.png")}
              alt=""
              width={639}
              height={707}
              className="h-auto w-full max-w-[649px] object-contain"
            />
          }
        />

        <LandingPricing />

        <FinalCta flatImage assets={{ btnNoise: assets.btnNoise, image: asset("lp-cta.png") }} />
      </main>

      <footer className="footer">
        <div className="container footer__links">
          <Link href="/terms">Условия</Link>
          <Link href="/terms/privacy">Политика обработки персональных данных</Link>
          <Link href="/terms/consent">Согласие на обработку персональных данных</Link>
          <span>ООО «ЗЕИП» · ИНН 5906189643</span>
        </div>
      </footer>
    </div>
  );
}
