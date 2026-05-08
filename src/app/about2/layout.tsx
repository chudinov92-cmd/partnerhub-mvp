import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-about2-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-about2-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zeip — О проекте",
  description:
    "Карта возможностей: специалисты, предприниматели и команда на одной карте.",
};

export default function About2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${manrope.variable} ${inter.variable} min-h-screen bg-white font-[family-name:var(--font-about2-body)] text-slate-900 antialiased`}
    >
      {children}
    </div>
  );
}
