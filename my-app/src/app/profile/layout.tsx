import type { Metadata } from "next";
import { privatePageRobots } from "@/lib/pageMetadata";

export const metadata: Metadata = {
  title: "Профиль — Zeip",
  robots: privatePageRobots,
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
