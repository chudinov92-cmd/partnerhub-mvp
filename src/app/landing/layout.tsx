import type { Metadata } from "next";
import { Inter, DM_Sans, Space_Grotesk } from "next/font/google";
import "./landing.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-landing-inter",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-landing-dmsans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-landing-spacegrotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zeip — место, где идеи становятся реальностью",
  description:
    "Посадочная страница Zeip: найди людей для проектов рядом и начни с первого сообщения.",
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${inter.variable} ${dmSans.variable} ${spaceGrotesk.variable} bg-white text-slate-900`}
    >
      {children}
    </div>
  );
}

