import type { Metadata } from "next";
import { privatePageRobots } from "@/lib/pageMetadata";

export const metadata: Metadata = {
  title: "Настройки — Zeip",
  robots: privatePageRobots,
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
