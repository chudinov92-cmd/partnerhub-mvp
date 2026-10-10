import type { Metadata } from "next";
import { privatePageRobots } from "@/lib/pageMetadata";

export const metadata: Metadata = {
  title: "Вход — Zeip",
  robots: privatePageRobots,
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
