"use client";

import Link from "next/link";
import { useState } from "react";
import type { Profile } from "@/types";

export type PostCommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: any;
};

type CurrentUserLite = {
  profileId: string;
  isBlocked: boolean;
};

type PostCommentsProps = {
  postId: string;
  comments: PostCommentRow[];
  currentUser: CurrentUserLite | null;
  profiles: Profile[];
  formatDateTime: (iso: string) => string;
  onOpenAuthor: (profile: Profile, anchor: HTMLElement) => void;
  onSubmitComment: (postId: string, body: string) => Promise<void>;
};

export function PostComments({
  postId,
  comments,
  currentUser,
  profiles,
  formatDateTime,
  onOpenAuthor,
  onSubmitComment,
}: PostCommentsProps) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser || currentUser.isBlocked) return;
    const t = draft.trim();
    if (!t) return;
    setSending(true);
    setLocalError(null);
    try {
      await onSubmitComment(postId, t);
      setDraft("");
    } catch (err: any) {
      setLocalError(err?.message ?? "Не удалось отправить комментарий.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="mt-2 border-t border-gray-100 pt-2"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <p className="mb-1.5 text-[11px] font-medium text-slate-500">
        Комментарии {comments.length > 0 ? `(${comments.length})` : ""}
      </p>

      <ul className="mb-2 space-y-2">
        {comments.map((c) => {
          const authorObj = Array.isArray(c.author) ? c.author[0] : c.author;
          const name = authorObj?.full_name || "Аноним";
          const online = authorObj?.last_seen_at
            ? Date.now() - new Date(authorObj.last_seen_at).getTime() <=
              2 * 60 * 1000
            : false;
          const prof = profiles.find((p) => p.id === c.author_id);
          return (
            <li key={c.id} className="flex gap-2">
              <button
                type="button"
                className="relative h-8 w-8 shrink-0 cursor-pointer border-0 bg-transparent p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  const inner = (e.currentTarget as HTMLElement).querySelector(
                    "[data-comment-avatar]",
                  ) as HTMLElement | null;
                  if (prof && inner) onOpenAuthor(prof, inner);
                }}
              >
                <div
                  data-comment-avatar
                  className="relative flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-[11px] font-medium text-white"
                >
                  {(name[0] || "?").toUpperCase()}
                  <span
                    className={`pointer-events-none absolute bottom-0 right-0 z-[1] h-2.5 w-2.5 rounded-full border-2 border-white ${
                      online ? "bg-emerald-500" : "bg-gray-400"
                    }`}
                    aria-hidden
                  />
                </div>
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                  <button
                    type="button"
                    className="text-left text-[11px] font-medium text-slate-900 hover:text-emerald-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (prof) onOpenAuthor(prof, e.currentTarget);
                    }}
                  >
                    {name}
                  </button>
                  <span className="text-[10px] text-gray-400">
                    {c.created_at ? formatDateTime(c.created_at) : ""}
                  </span>
                </div>
                <p className="whitespace-pre-wrap break-words text-[11px] text-slate-700">
                  {c.body}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {currentUser ? (
        currentUser.isBlocked ? (
          <p className="text-[11px] text-amber-700">
            Комментирование недоступно для заблокированного аккаунта.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-1">
            {localError ? (
              <p className="text-[11px] text-red-600">{localError}</p>
            ) : null}
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 1000))}
              rows={2}
              placeholder="Написать комментарий…"
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-800 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30"
              disabled={sending}
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                {draft.length}/1000
              </span>
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-1 text-[11px] font-medium text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50"
              >
                {sending ? "Отправка…" : "Отправить"}
              </button>
            </div>
          </form>
        )
      ) : (
        <p className="text-[11px] text-slate-500">
          <Link
            href="/auth"
            className="font-medium text-emerald-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Войдите
          </Link>
          , чтобы оставить комментарий.
        </p>
      )}
    </div>
  );
}
