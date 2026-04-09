import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-landing-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-landing-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zeip — карта возможностей для команд и стартапов",
  description:
    "Не соцсеть. Платформа для тех, кто хочет делать: профиль на карте, поиск партнёров и команды.",
};

export default function HomeLandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${manrope.variable} ${inter.variable} min-h-screen font-[family-name:var(--font-landing-body)] antialiased`}
    >
      {children}
    </div>
  );
}
