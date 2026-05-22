"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/app/admin/AdminShell";
import type { AdminSupportChatRow } from "@/app/api/admin/support/route";
import type { ChatMessage } from "@/types";
import { SupportAppealCard } from "@/components/SupportAppealCard";
import { isAppealMessage } from "@/lib/support";

type MessagesResponse = {
  messages: ChatMessage[];
  isClosed: boolean;
  supportProfileId: string;
};

export default function AdminSupportPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chats, setChats] = useState<AdminSupportChatRow[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatClosed, setChatClosed] = useState(false);
  const [supportProfileId, setSupportProfileId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const loadChats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/support", { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Не удалось загрузить чаты");
      setChats(json.chats ?? []);
      setSupportProfileId(json.supportProfileId ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
      setChats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (chatId: string) => {
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/support?chatId=${encodeURIComponent(chatId)}`,
        { credentials: "include" },
      );
      const json = (await res.json()) as MessagesResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Не удалось загрузить сообщения");
      setMessages(json.messages ?? []);
      setChatClosed(Boolean(json.isClosed));
      setSupportProfileId(json.supportProfileId ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки сообщений");
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      setChatClosed(false);
      return;
    }
    void loadMessages(selectedChatId);
  }, [selectedChatId, loadMessages]);

  const filteredChats = useMemo(() => {
    const query = q.trim().toLocaleLowerCase("ru-RU");
    if (!query) return chats;
    return chats.filter((c) => {
      const hay = [
        c.userFullName ?? "",
        c.userCity ?? "",
        c.lastMessagePreview ?? "",
        c.chatId,
        c.userProfileId,
      ]
        .join(" ")
        .toLocaleLowerCase("ru-RU");
      return hay.includes(query);
    });
  }, [chats, q]);

  const selectedChat = chats.find((c) => c.chatId === selectedChatId) ?? null;

  const postReply = async (action?: "close") => {
    if (!selectedChatId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/support/reply", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "close"
            ? { chatId: selectedChatId, action: "close" }
            : { chatId: selectedChatId, content: replyText },
        ),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Ошибка запроса");

      if (action === "close") {
        setChatClosed(true);
        setChats((prev) =>
          prev.map((c) =>
            c.chatId === selectedChatId ? { ...c, isClosed: true } : c,
          ),
        );
      } else {
        setReplyText("");
        if (json.message) {
          setMessages((prev) => [...prev, json.message as ChatMessage]);
        }
        await loadChats();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h1 className="text-lg font-semibold text-slate-900">Поддержка</h1>
        <p className="mt-1 text-sm text-slate-500">
          Обращения пользователей в личных чатах с аккаунтом поддержки.
        </p>

        {error ? (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="flex flex-col gap-2">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск по имени, городу…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-base text-slate-900"
            />
            {loading ? (
              <p className="text-sm text-slate-500">Загрузка…</p>
            ) : filteredChats.length === 0 ? (
              <p className="text-sm text-slate-500">Обращений пока нет.</p>
            ) : (
              <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
                {filteredChats.map((c) => (
                  <li key={c.chatId}>
                    <button
                      type="button"
                      onClick={() => setSelectedChatId(c.chatId)}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                        selectedChatId === c.chatId
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-900">
                          {c.userFullName || "Без имени"}
                        </span>
                        {c.isClosed ? (
                          <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                            закрыто
                          </span>
                        ) : null}
                      </div>
                      {c.userCity ? (
                        <p className="text-xs text-slate-500">{c.userCity}</p>
                      ) : null}
                      {c.lastMessagePreview ? (
                        <p className="mt-1 truncate text-xs text-slate-600">
                          {c.lastMessagePreview}
                        </p>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex min-h-[320px] flex-col rounded-xl border border-slate-200">
            {!selectedChatId ? (
              <p className="flex flex-1 items-center justify-center p-6 text-sm text-slate-500">
                Выберите чат слева
              </p>
            ) : (
              <>
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="font-semibold text-slate-900">
                    {selectedChat?.userFullName || "Пользователь"}
                  </p>
                  {chatClosed ? (
                    <p className="text-xs text-amber-700">
                      Обращение закрыто. Пользователь может открыть новое с темой
                      и описанием.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">Открытое обращение</p>
                  )}
                </div>

                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
                  {(() => {
                    let appealCounter = 0;
                    return messages.map((m) => {
                    const isSupport =
                      supportProfileId != null &&
                      m.sender_id === supportProfileId;
                    const isAppeal = isAppealMessage(m.content);
                    if (isAppeal) appealCounter += 1;
                    return (
                      <div
                        key={m.id}
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                          isSupport
                            ? "mr-auto bg-slate-100 text-slate-900"
                            : "ml-auto bg-emerald-600 text-white"
                        }`}
                      >
                        {isAppeal ? (
                          <SupportAppealCard
                            content={m.content}
                            appealIndex={appealCounter}
                            isOwn={!isSupport}
                          />
                        ) : (
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        )}
                        <p
                          className={`mt-1 text-[10px] ${
                            isSupport ? "text-slate-400" : "text-white/80"
                          }`}
                        >
                          {m.created_at
                            ? new Date(m.created_at).toLocaleString("ru-RU")
                            : ""}
                        </p>
                      </div>
                    );
                  });
                  })()}
                  {messages.length === 0 ? (
                    <p className="text-sm text-slate-400">Сообщений нет</p>
                  ) : null}
                </div>

                <div className="border-t border-slate-100 p-4 space-y-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value.slice(0, 1000))}
                    rows={3}
                    placeholder="Ответ от имени поддержки…"
                    disabled={chatClosed || busy}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-base text-slate-900 disabled:opacity-60"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy || chatClosed || !replyText.trim()}
                      onClick={() => void postReply()}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Отправить ответ
                    </button>
                    <button
                      type="button"
                      disabled={busy || chatClosed}
                      onClick={() => void postReply("close")}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Закрыть обращение
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
