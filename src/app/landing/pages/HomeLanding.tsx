"use client";

import Image from "next/image";
import { FeatureSplit } from "@/app/landing/components/FeatureSplit";
import { FinalCta } from "@/app/landing/components/FinalCta";
import { Hero } from "@/app/landing/components/Hero";
import { Mechanics } from "@/app/landing/components/Mechanics";
import { ShotGallery } from "@/app/landing/components/ShotGallery";

const asset = (p: string) => `/assets/landing${p.startsWith("/") ? "" : "/"}${p}`;

export function HomeLanding() {
  const assets = {
    logo: asset("zeip-logo.png"),
    heroGlow: asset("hero-illustration.png"),
    btnNoise: asset("btn-noise.png"),
    phoneShot: asset("shot-carousel.png"),
    mechanics: {
      pin: asset("mechanic-pin.svg"),
      map: asset("mechanic-map.svg"),
      send: asset("mechanic-send.svg"),
    },
  } as const;

  return (
    <div className="page">
      <Hero assets={{ logo: assets.logo, glow: assets.heroGlow, btnNoise: assets.btnNoise }} />

      <main>
        <FeatureSplit
          title="Большие проекты не рождаются в вакууме."
          body="Твоя идея останется в голове, если не найти тех, кто поможет воплотить её в жизнь. Мы помогаем найти людей, готовых воплощать идеи в реальность здесь и сейчас."
          visual={
            <Image
              src={asset("image-container-1.png")}
              alt="Иллюстрация Zeip"
              width={649}
              height={430}
              sizes="(max-width: 1024px) 100vw, 46vw"
              className="h-auto w-full max-w-[649px] object-contain"
            />
          }
        />

        <section className="section section--indigo" aria-label="Превью приложения">
          <div className="container">
            <ShotGallery
              shots={[
                { src: assets.phoneShot, alt: "" },
                { src: assets.phoneShot, alt: "" },
                { src: assets.phoneShot, alt: "" },
              ]}
            />
          </div>
        </section>

        <FeatureSplit
          reverse
          title="Команда на расстоянии вытянутой руки."
          body="Тебе не нужно искать специалистов на другом конце страны, регистрироваться на форумах или создавать аккаунт на сервисах подбора сотрудников. Твой будущий партнер может пить кофе в кофейне за углом. Zeip сокращает дистанцию до минимума."
          visual={
            <Image
              src={asset("image-container.png")}
              alt="Иллюстрация — команда рядом"
              width={649}
              height={430}
              sizes="(max-width: 1024px) 100vw, 46vw"
              className="h-auto w-full max-w-[649px] object-contain"
            />
          }
        />

        <FeatureSplit
          title="От первого сообщения до общего проекта."
          body={
            "• Без объявлений;\n• Без резюме и откликов;\n• Без цен на услуги.\n\nПросто напиши «Привет, есть вопрос, можешь помочь?». Всё начинается с первого сообщения."
          }
          visual={
            <Image
              src={asset("image-container-2.png")}
              alt="Иллюстрация — первое сообщение"
              width={649}
              height={430}
              sizes="(max-width: 1024px) 100vw, 46vw"
              className="h-auto w-full max-w-[649px] object-contain"
            />
          }
        />

        <Mechanics
          title="Механика"
          items={[
            { iconSrc: assets.mechanics.pin, title: "Заяви о себе", text: "Напиши о себе и расскажи, кто тебе нужен" },
            { iconSrc: assets.mechanics.map, title: "Открой карту", text: "Найди нужных экспертов" },
            { iconSrc: assets.mechanics.send, title: "Начни строить", text: "Напиши и реши свою задачу уже сегодня" },
          ]}
        />

        <FeatureSplit
          reverse
          title="Начни со своего двора, охвати всю страну."
          body="Если нужного профессионала не оказалось в твоем квартале - просто расширь радиус поиска. Мы покажем тебе специалистов по всему городу и стране. Твои люди найдутся в любом масштабе."
          visual={
            <Image
              src={asset("image-group.png")}
              alt="Иллюстрация — поиск по городу и стране"
              width={649}
              height={430}
              sizes="(max-width: 1024px) 100vw, 46vw"
              className="h-auto w-full max-w-[649px] object-contain"
            />
          }
        />

        <FinalCta flatImage assets={{ btnNoise: assets.btnNoise, image: asset("image-container-3.png") }} />
      </main>

      <footer className="footer" />
    </div>
  );
}

