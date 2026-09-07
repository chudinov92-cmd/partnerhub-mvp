"use client";

import type { MapPageController } from "../hooks/useMapPageController";
import { PushOptInBanner } from "@/components/PushOptInBanner";
import { formatChatListPreview } from "@/services/chatService";
import { isOnline } from "../utils";

type Props = MapPageController;

export function ChatsColumn(props: Props) {
  const {
    hideMobileMainStack,
    unreadByUser,
    contactsOnlyMode,
    resetContactsMode,
    setMobileTab,
    currentUser,
    loading,
    openProfileOverlay,
    markProfileViewed,
    filteredChatList,
    openChatFromList,
    showChatsColumn
  } = props;

  return (
<>
        <aside
          className={`flex h-full min-h-0 w-full flex-col overflow-hidden bg-white shadow-lg lg:w-80 lg:shrink-0 lg:border-l lg:border-gray-200 ${
            showChatsColumn && !hideMobileMainStack ? "flex" : "hidden"
          } lg:flex`}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 shrink-0 text-slate-900"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <path d="M13 8H7" />
                <path d="M17 12H7" />
              </svg>
              <h2 className="font-semibold text-slate-900">
                {contactsOnlyMode ? "Контакты" : "Мои чаты"}
              </h2>
            </div>
            {contactsOnlyMode ? (
              <button
                type="button"
                onClick={() => {
                  resetContactsMode();
                  setMobileTab("my-chats");
                }}
                className="rounded-full border border-gray-200 px-3 py-1 text-[11px] font-medium text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50/50 hover:text-emerald-700"
              >
                Сбросить
              </button>
            ) : null}
          </div>

          {currentUser && !contactsOnlyMode ? (
            <PushOptInBanner hasSession />
          ) : null}

          {!loading && filteredChatList.length === 0 && (
            <p className="px-4 py-2 text-sm text-slate-500">
              {contactsOnlyMode
                ? "У вас пока нет личных диалогов с контактами. Добавьте контакт или начните переписку."
                : "У вас пока нет личных диалогов. Начните переписку, чтобы чат появился в списке."}
            </p>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <ul className="space-y-3">
              {filteredChatList.map((item) => {
                const unread = unreadByUser[item.profile.id] ?? 0;
                const name = item.profile.full_name || "Без имени";
                const online = isOnline(item.profile.last_seen_at ?? null);
                return (
                <li
                  key={item.profile.id}
                  onClick={() => openChatFromList(item)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all hover:border-gray-300 hover:shadow-lg ${
                    unread > 0
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div className="relative flex h-12 w-12 items-center justify-center overflow-visible rounded-full bg-slate-900 text-sm font-medium text-white">
                        {(name[0] || "?").toUpperCase()}
                        <div
                          className={`pointer-events-none absolute bottom-0 right-0 z-[1] box-border h-4 w-4 rounded-full border-2 border-white ${
                            online ? "bg-emerald-500" : "bg-gray-400"
                          }`}
                          aria-hidden
                        />
                      </div>
                      {unread > 0 ? (
                        <div className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-md">
                          {unread > 9 ? "9+" : unread}
                        </div>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openProfileOverlay(item.profile);
                            void markProfileViewed(
                              item.profile.id,
                              item.profile.content_updated_at ??
                                new Date().toISOString(),
                            );
                          }}
                          className="truncate text-left font-medium text-slate-900 hover:text-emerald-600"
                        >
                          {name}
                        </button>
                        {item.profile.rating_count != null &&
                        item.profile.rating_count > 0 ? (
                          <span className="shrink-0 text-xs font-medium text-amber-500">
                            ★ {item.profile.rating_count}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-slate-600">
                        {item.profile.role_title || "Профессия не указана"}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {formatChatListPreview(item.lastMessagePreview) ??
                          "Нет сообщений"}
                      </p>
                    </div>
                  </div>
                </li>
              );
              })}
            </ul>
          </div>
        </aside>
</>
  );
}
