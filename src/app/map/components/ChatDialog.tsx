"use client";

import type { MapPageController } from "../hooks/useMapPageController";
import Link from "next/link";
import { SupportAppealCard } from "@/components/SupportAppealCard";
import { ProfileShareCard } from "@/components/ProfileShareCard";
import { MessageLinks } from "@/components/MessageLinks";
import { isAppealMessage } from "@/lib/support";
import { isProfileShareMessage } from "@/lib/profileShare";
import { scrollComposerIntoView, isOnline } from "../utils";

type Props = MapPageController;

export function ChatDialog(props: Props) {
  const {
    vvTop,
    vvHeight,
    isMobileLayout,
    activeChatUser,
    chatMessages,
    chatInput,
    setChatInput,
    editingMessageId,
    setEditingMessageId,
    deletingMessageId,
    chatLoading,
    chatError,
    chatSending,
    supportSubject,
    setSupportSubject,
    supportDescription,
    setSupportDescription,
    supportFieldErrors,
    setSupportFieldErrors,
    activeChatIsClosed,
    chatScrollRef,
    chatWindowRef,
    chatInputRef,
    supportDescriptionRef,
    profiles,
    currentUser,
    openProfileOverlay,
    openProfileFromChatLink,
    markProfileViewed,
    profileReadyForMessaging,
    isSupportChat,
    showSupportAppealForm,
    closeChatWindow,
    formatDateTime,
    handleSendSupportAppeal,
    handleSendChatMessage,
    handleDeleteChatMessage
  } = props;

  return (
<>
        {activeChatUser && (
          <div
            ref={chatWindowRef}
            data-chat-window
            className="pointer-events-auto fixed inset-x-0 top-0 z-[1600] flex flex-col overflow-hidden bg-white lg:inset-auto lg:top-[calc(var(--zeip-topbar-height,3.5rem)+env(safe-area-inset-top,0px))] lg:right-[336px] lg:left-auto lg:bottom-auto lg:h-[760px] lg:max-h-[calc(100dvh-var(--zeip-topbar-height,3.5rem)-env(safe-area-inset-top,0px)-1rem)] lg:w-[min(48rem,calc(100vw-20rem-336px-1rem))] lg:rounded-2xl lg:border lg:border-slate-200/80 lg:shadow-[0_20px_50px_rgba(15,23,42,0.15)] lg:ring-1 lg:ring-slate-900/5"
            style={
              isMobileLayout
                ? {
                    top: vvTop,
                    height: vvHeight,
                    left: 0,
                    right: 0,
                    bottom: "auto",
                  }
                : undefined
            }
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/40 px-3 py-2.5">
              <div className="min-w-0">
                {isSupportChat ? (
                  <div className="flex min-w-0 items-start gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-medium text-white">
                      П
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        Поддержка
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {activeChatIsClosed
                          ? "Обращение закрыто — можно отправить новое"
                          : "Служба поддержки Zeip"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const fullProfile =
                        profiles.find((p) => p.id === activeChatUser.id) ??
                        activeChatUser;
                      openProfileOverlay(fullProfile);
                      void markProfileViewed(
                        fullProfile.id,
                        fullProfile.content_updated_at ??
                          new Date().toISOString(),
                      );
                    }}
                    title={
                      isOnline(activeChatUser.last_seen_at ?? null)
                        ? "Онлайн"
                        : "Оффлайн"
                    }
                    className="group flex w-full min-w-0 items-start gap-2 text-left"
                  >
                    <div className="relative shrink-0">
                      <div className="relative flex h-10 w-10 items-center justify-center overflow-visible rounded-full bg-slate-900 text-sm font-medium text-white">
                        {(activeChatUser.full_name?.[0] || "?").toUpperCase()}
                        <div
                          className={`pointer-events-none absolute bottom-0 right-0 z-[1] box-border h-4 w-4 rounded-full border-2 border-white ${
                            isOnline(activeChatUser.last_seen_at ?? null)
                              ? "bg-emerald-500"
                              : "bg-gray-400"
                          }`}
                          aria-hidden
                        />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900 group-hover:text-emerald-600">
                        {activeChatUser.full_name || "Без имени"}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {activeChatUser.role_title ||
                          activeChatUser.city ||
                          "Профессия не указана"}
                      </p>
                    </div>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={closeChatWindow}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
              <div
                ref={chatScrollRef}
                className="mb-2 min-h-0 flex-1 overflow-y-auto space-y-2"
              >
                {chatLoading ? (
                  <p className="text-xs text-slate-500">
                    Загружаем сообщения...
                  </p>
                ) : !currentUser && isSupportChat ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-4 text-sm text-slate-700">
                    <p>Чтобы написать в поддержку, войдите в аккаунт.</p>
                    <Link
                      href="/auth"
                      className="mt-3 inline-flex rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700"
                    >
                      Войти
                    </Link>
                  </div>
                ) : (
                  <>
                    {(() => {
                      let appealCounter = 0;
                      return chatMessages.map((m) => {
                        const isOwn =
                          m.sender_id === currentUser?.profileId;
                        const isAppeal =
                          isSupportChat && isAppealMessage(m.content);
                        const isProfileShare = isProfileShareMessage(m.content);
                        if (isAppeal) appealCounter += 1;
                        return (
                          <div
                            key={m.id}
                            className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-sm ${
                              isOwn
                                ? "ml-auto bg-[#009966] text-white"
                                : "mr-auto bg-slate-50/70 text-slate-900"
                            }`}
                          >
                            {isProfileShare ? (
                              <ProfileShareCard
                                content={m.content}
                                isOwn={isOwn}
                              />
                            ) : isAppeal ? (
                              <SupportAppealCard
                                content={m.content}
                                appealIndex={appealCounter}
                                isOwn={isOwn}
                              />
                            ) : (
                              <MessageLinks
                                content={m.content ?? ""}
                                isOwn={isOwn}
                                onOpenProfile={openProfileFromChatLink}
                              />
                            )}
                            <div
                              className={`mt-1 flex flex-col items-start gap-1 text-xs ${
                                isOwn
                                  ? "text-white/80"
                                  : "text-slate-400"
                              }`}
                            >
                              <span>
                                {m.created_at
                                  ? formatDateTime(m.created_at)
                                  : ""}
                                {m.edited_at ? " · изменено" : ""}
                              </span>
                              {isOwn && !isAppeal ? (
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                  {!isProfileShare ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingMessageId(m.id);
                                        setChatInput(m.content ?? "");
                                      }}
                                      className="underline-offset-2 hover:underline"
                                    >
                                      Изменить
                                    </button>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void handleDeleteChatMessage(m);
                                    }}
                                    disabled={deletingMessageId === m.id}
                                    className="underline-offset-2 hover:underline disabled:opacity-60"
                                  >
                                    {deletingMessageId === m.id
                                      ? "Удаляем…"
                                      : "Удалить"}
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      });
                    })()}
                    {chatMessages.length === 0 && !chatLoading && (
                      <p className="text-xs text-slate-400">
                        {isSupportChat
                          ? "Опишите проблему ниже — мы ответим в этом чате."
                          : "Пока нет сообщений. Напишите что‑нибудь первым."}
                      </p>
                    )}
                  </>
                )}
              </div>

              {chatError && (
                <p className="mb-1 text-[11px] text-red-600">{chatError}</p>
              )}

              {currentUser && showSupportAppealForm ? (
                <form
                  onSubmit={handleSendSupportAppeal}
                  className="mt-1 shrink-0 space-y-2 border-t border-slate-200 bg-white pt-2 pb-1"
                >
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-600">
                      Тема обращения
                    </label>
                    <input
                      type="text"
                      value={supportSubject}
                      onChange={(e) => {
                        setSupportSubject(e.target.value.slice(0, 200));
                        setSupportFieldErrors((prev) => ({
                          ...prev,
                          subject: undefined,
                        }));
                      }}
                      placeholder="Кратко опишите суть"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2 py-2 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/20"
                      onFocus={(e) => {
                        if (!isMobileLayout) scrollComposerIntoView(e.currentTarget);
                      }}
                    />
                    {supportFieldErrors.subject ? (
                      <p className="mt-1 text-[11px] text-red-600">
                        {supportFieldErrors.subject}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-600">
                      Описание проблемы
                    </label>
                    <textarea
                      ref={supportDescriptionRef}
                      value={supportDescription}
                      onChange={(e) => {
                        setSupportDescription(e.target.value.slice(0, 2000));
                        setSupportFieldErrors((prev) => ({
                          ...prev,
                          description: undefined,
                        }));
                      }}
                      placeholder="Подробности, шаги, что ожидали увидеть"
                      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-2 py-2 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/20"
                      onFocus={(e) => {
                        if (!isMobileLayout) scrollComposerIntoView(e.currentTarget);
                      }}
                    />
                    {supportFieldErrors.description ? (
                      <p className="mt-1 text-[11px] text-red-600">
                        {supportFieldErrors.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={chatSending}
                      className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-60"
                    >
                      {chatSending ? "Отправляем..." : "Отправить обращение"}
                    </button>
                  </div>
                </form>
              ) : currentUser && !profileReadyForMessaging ? (
                <div className="mt-1 shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-slate-700">
                  <p>
                    Заполните город и профессию в профиле, чтобы отправлять
                    сообщения.
                  </p>
                  <Link
                    href="/profile"
                    className="mt-3 inline-flex rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700"
                  >
                    Заполнить профиль
                  </Link>
                </div>
              ) : currentUser ? (
                <form
                  onSubmit={handleSendChatMessage}
                  className="mt-1 shrink-0 space-y-1 border-t border-slate-200 bg-white pt-2 pb-1"
                >
                  <textarea
                    ref={chatInputRef}
                    value={chatInput}
                    onChange={(e) =>
                      setChatInput(e.target.value.slice(0, 1000))
                    }
                    placeholder="Напишите сообщение…"
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/20"
                    onFocus={(e) => {
                      if (!isMobileLayout) scrollComposerIntoView(e.currentTarget);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (!chatSending && chatInput.trim()) {
                          handleSendChatMessage(e as React.FormEvent);
                        }
                      }
                    }}
                  />
                  {editingMessageId ? (
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-amber-600">
                        Режим редактирования
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMessageId(null);
                          setChatInput("");
                        }}
                        className="text-[11px] font-medium text-slate-600 hover:underline"
                      >
                        Отмена
                      </button>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      {chatInput.length}/1000
                    </span>
                    <button
                      type="submit"
                      disabled={chatSending || !chatInput.trim()}
                      className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-1 text-xs font-medium text-white shadow-sm transition hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-60"
                    >
                      {chatSending
                        ? "Отправляем..."
                        : editingMessageId
                          ? "Сохранить"
                          : "Отправить"}
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          </div>
        )}
</>
  );
}
