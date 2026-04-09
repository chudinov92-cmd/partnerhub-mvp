import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zeip — Админка",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50">{children}</div>;
}

