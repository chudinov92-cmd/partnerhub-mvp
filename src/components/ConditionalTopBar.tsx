"use client";

import { usePathname } from "next/navigation";
import { TopBar } from "@/components/TopBar";

/** Скрывает основную шапку приложения на маркетинговых страницах (например /about). */
export function ConditionalTopBar() {
  const pathname = usePathname();
  if (
    pathname === "/about" ||
    pathname === "/about2" ||
    pathname === "/about3" ||
    pathname === "/landing"
  )
    return null;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  return <TopBar />;
}
