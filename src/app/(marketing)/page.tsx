import type { Metadata } from "next";
import { HomeLanding } from "@/app/landing/pages/HomeLanding";
import { fetchPublicStats } from "@/services/statsPublicService";

export const metadata: Metadata = {
  title: "Зеип — карта людей для бизнес-проектов",
  description:
    "Зеип (Zeip) — карта людей для бизнес-проектов. Сделай первый шаг и появись на карте. Найди партнёра, единомышленника или команду рядом.",
  alternates: { canonical: "https://zeip.ru" },
};

export default async function HomePage() {
  const stats = await fetchPublicStats();
  return <HomeLanding stats={stats} />;
}
