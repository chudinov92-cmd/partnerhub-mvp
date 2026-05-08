import type { Metadata } from "next";
import { Inter, Lato } from "next/font/google";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-about3-inter",
  weight: ["500", "600"],
  display: "swap",
});

const lato = Lato({
  subsets: ["latin", "latin-ext"],
  variable: "--font-about3-lato",
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zeip — Карта возможностей",
  description:
    "О проекте Zeip: специалисты, предприниматели и карта возможностей.",
};

export default function About3Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${inter.variable} ${lato.variable} min-h-screen bg-[#f9fafb] text-slate-900 antialiased`}
      style={{
        fontFamily:
          "var(--font-about3-lato), var(--font-about3-inter), ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {children}
    </div>
  );
}
