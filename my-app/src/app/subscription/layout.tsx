import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Тариф Pro — Zeip",
  description:
    "Подписка Pro: приоритет на карте, чаты, без рекламы. 249 ₽ / 30 дней.",
};

export default function SubscriptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
