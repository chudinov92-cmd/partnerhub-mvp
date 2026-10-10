import type { Metadata } from "next";
import "../landing/landing.css";

export const metadata: Metadata = {
  title: "Zeip — место, где идеи становятся реальностью",
  description:
    "Посадочная страница Zeip: найди людей для проектов рядом и начни с первого сообщения.",
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white text-slate-900">{children}</div>
  );
}
