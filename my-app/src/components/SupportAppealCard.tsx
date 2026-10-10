"use client";

import { parseAppealMessage } from "@/lib/support";

export function SupportAppealCard({
  content,
  appealIndex,
  isOwn,
}: {
  content: string;
  appealIndex: number;
  isOwn: boolean;
}) {
  const parsed = parseAppealMessage(content);
  if (!parsed) {
    return <p>{content}</p>;
  }

  return (
    <div
      className={`rounded-xl border px-3 py-2 text-sm ${
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
        Обращение №{appealIndex}
      </p>
      <p className={isOwn ? "text-white" : "text-slate-900"}>
        <span className="font-medium">Тема:</span> {parsed.subject}
      </p>
      <p
        className={`mt-2 whitespace-pre-wrap ${
          isOwn ? "text-white/95" : "text-slate-800"
        }`}
      >
        <span className="font-medium">Описание:</span> {parsed.description}
      </p>
    </div>
  );
}
