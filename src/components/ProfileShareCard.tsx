"use client";

import Link from "next/link";
import { parseProfileShareMessage } from "@/lib/profileShare";

export function ProfileShareCard({
  content,
  isOwn,
}: {
  content: string;
  isOwn: boolean;
}) {
  const parsed = parseProfileShareMessage(content);
  if (!parsed) {
    return <p>{content}</p>;
  }

  const initial = (parsed.name[0] || "?").toLocaleUpperCase("ru-RU");
  const subtitle =
    [parsed.role_title, parsed.city].filter(Boolean).join(" · ") ||
    "Профиль участника";

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 text-sm ${
        isOwn
          ? "border-emerald-400/40 bg-emerald-600/20"
          : "border-slate-200 bg-white"
      }`}
    >
      <p
        className={`mb-2 text-xs font-semibold uppercase tracking-wide ${
          isOwn ? "text-emerald-100" : "text-slate-500"
        }`}
      >
        Поделился профилем
      </p>
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            isOwn ? "bg-white/20 text-white" : "bg-slate-800 text-white"
          }`}
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`truncate font-semibold ${isOwn ? "text-white" : "text-slate-900"}`}>
            {parsed.name}
          </p>
          <p className={`truncate text-xs ${isOwn ? "text-white/80" : "text-slate-500"}`}>
            {subtitle}
          </p>
          <Link
            href={`/profiles/${parsed.id}`}
            className={`mt-2 inline-flex rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              isOwn
                ? "bg-white/15 text-white hover:bg-white/25"
                : "bg-slate-100 text-slate-800 hover:bg-slate-200"
            }`}
          >
            Открыть профиль
          </Link>
        </div>
      </div>
    </div>
  );
}
