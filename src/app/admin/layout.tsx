import type { Metadata } from "next";
import { privatePageRobots } from "@/lib/pageMetadata";

export const metadata: Metadata = {
  title: "Zeip — Админка",
  robots: privatePageRobots,
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50">{children}</div>;
}

