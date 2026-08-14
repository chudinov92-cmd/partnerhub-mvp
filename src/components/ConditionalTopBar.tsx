"use client";

import { usePathname } from "next/navigation";
import { TopBar } from "@/components/TopBar";

/** Скрывает TopBar на лендинге, квизе онбординга и в админке. */
export function ConditionalTopBar() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) return null;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  return <TopBar />;
}
