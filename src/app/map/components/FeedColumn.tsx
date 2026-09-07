"use client";

import type { MapPageController } from "../hooks/useMapPageController";
import Link from "next/link";
import { isPaidGateMode } from "@/lib/accessMode";
import { isOnline, scrollComposerIntoView } from "../utils";

type Props = MapPageController;

export function FeedColumn(props: Props) {
  const {
    keyboardInset,
    mobileTab,
    hideMobileMainStack,
    expandedPosts,
    newPostBody,
    setNewPostBody,
    editingPostId,
    setEditingPostId,
    deletingPostId,
    creating,
    createError,
    generalChatSearch,
    setGeneralChatSearch,
    newPostBodyRef,
    feedScrollRef,
    profiles,
    currentUser,
    loading,
    error,
    openPaywallDrawer,
    openProfileOverlay,
    markProfileViewed,
    selectedCity,
    isRussiaChat,
    posts,
    postsLoading,
    postsLoadError,
    searchedVisiblePosts,
    handleTogglePost,
    formatDateTime,
    canWriteGeneralChat,
    handleCreatePost,
    handleDeletePost
  } = props;

  return (
<>
        <section
          className={`flex h-full min-h-0 w-full flex-col overflow-hidden bg-white shadow-lg lg:w-80 lg:shrink-0 lg:border-r lg:border-gray-200 ${
            mobileTab === "chat" && !hideMobileMainStack ? "flex" : "hidden"
          } lg:flex`}
          style={
            keyboardInset > 0 ? { paddingBottom: keyboardInset } : undefined
          }
        >
          <header className="shrink-0 border-b border-gray-200 px-4 py-3">
            <div className="flex items-start gap-2">
            <svg
              className="h-5 w-5 shrink-0 text-slate-900"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 7.5 7.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            <div className="min-w-0 flex-1">
              <h1 className="min-w-0 font-semibold leading-tight text-slate-900">
                <span className="block">Общий чат</span>
                <span className="block truncate text-xs font-normal text-slate-500">
                  {isRussiaChat ? "Для всей России" : selectedCity}
                </span>
              </h1>

              <div className="mt-2 flex items-center gap-2">
                <label htmlFor="general-chat-search" className="sr-only">
                  Поиск по сообщениям общего чата
                </label>
                <input
                  id="general-chat-search"
                  value={generalChatSearch}
                  onChange={(e) => setGeneralChatSearch(e.target.value.slice(0, 60))}
                  placeholder="Поиск по сообщениям…"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
                {generalChatSearch.trim() ? (
                  <button
                    type="button"
                    onClick={() => setGeneralChatSearch("")}
                    className="shrink-0 rounded-lg px-2 py-2 text-xs font-semibold text-slate-600 transition hover:bg-gray-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    aria-label="Очистить поиск"
                    title="Очистить"
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </div>
            </div>
          </header>

          <div
            ref={feedScrollRef}
            className="min-h-0 flex-1 overflow-y-auto px-4"
          >
          {postsLoading && (
            <p className="py-2 text-sm text-slate-500">Загрузка...</p>
          )}
          {error && <p className="py-2 text-sm text-red-600">{error}</p>}
          {postsLoadError && (
            <p className="py-2 text-sm text-red-600">{postsLoadError}</p>
          )}

          {!loading && !postsLoading && posts.length === 0 && (
            <p className="py-2 text-sm text-slate-500">
              {isRussiaChat
                ? "В общероссийском чате пока нет сообщений. Напишите первым."
                : `В чате «${selectedCity}» пока нет сообщений. Напишите первым.`}
            </p>
          )}

          {!loading &&
            !postsLoading &&
            posts.length > 0 &&
            searchedVisiblePosts.length === 0 && (
              <p className="py-2 text-sm text-slate-500">
                Ничего не найдено по запросу «{generalChatSearch.trim()}».
              </p>
            )}

          {/* Список постов с прокруткой */}
          <div className="space-y-4 py-4">
            <ul className="space-y-1">
              {searchedVisiblePosts.map((post) => {
                const isExpanded = expandedPosts.has(post.id);
                const body = post.body || "";
                const shouldTruncate = body.length > 200;
                const text = isExpanded
                  ? body
                  : shouldTruncate
                  ? body.slice(0, 200) + "…"
                  : body;

                const authorObj = Array.isArray(post.author)
                  ? post.author[0]
                  : post.author;
                const authorName = authorObj?.full_name || "Аноним";
                const authorOnline = isOnline(authorObj?.last_seen_at ?? null);
                const prof = (authorObj?.role_title as string | null) ?? null;

                const openAuthorCard = () => {
                  const p = profiles.find((pr) => pr.id === post.author_id);
                  if (p) {
                    openProfileOverlay(p);
                    void markProfileViewed(
                      p.id,
                      p.content_updated_at ?? new Date().toISOString(),
                    );
                  }
                };

                return (
                  <li
                    key={post.id}
                    className="group -mx-2 cursor-pointer rounded-lg px-2 py-2 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex gap-3">
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const inner = (e.currentTarget as HTMLElement)
                              .firstElementChild as HTMLElement;
                            void inner;
                            openAuthorCard();
                          }}
                          title={authorOnline ? "Онлайн" : "Оффлайн"}
                          className="block shrink-0 cursor-pointer border-0 bg-transparent p-0 text-left"
                        >
                          <div className="relative flex h-12 w-12 items-center justify-center overflow-visible rounded-full bg-slate-900 text-sm font-medium text-white">
                            {(authorName[0] || "?").toUpperCase()}
                            <div
                              className={`pointer-events-none absolute bottom-0 right-0 z-[1] box-border h-4 w-4 rounded-full border-2 border-white ${
                                authorOnline ? "bg-emerald-500" : "bg-gray-400"
                              }`}
                              aria-hidden
                            />
                          </div>
                        </button>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openAuthorCard();
                            }}
                            className="text-left text-sm font-medium text-slate-900 hover:text-emerald-600"
                          >
                            {authorName}
                          </button>
                          {prof ? (
                            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-slate-700">
                              {prof}
                            </span>
                          ) : null}
                        </div>
                        {body ? (
                          <p className="mb-1 text-sm text-slate-600">{text}</p>
                        ) : null}
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-xs text-gray-400">
                            {post.created_at ? formatDateTime(post.created_at) : ""}
                            {post.edited_at ? " · изменено" : ""}
                          </span>
                          {currentUser?.profileId &&
                          post.author_id === currentUser.profileId &&
                          !currentUser.isBlocked ? (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              {canWriteGeneralChat ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingPostId(post.id);
                                    setNewPostBody(post.body ?? "");
                                  }}
                                  className="text-xs font-medium text-emerald-600 hover:underline"
                                >
                                  Изменить
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDeletePost(post.id);
                                }}
                                disabled={deletingPostId === post.id}
                                className="text-xs font-medium text-rose-600 hover:underline disabled:opacity-60"
                              >
                                {deletingPostId === post.id
                                  ? "Удаляем…"
                                  : "Удалить"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                        {shouldTruncate && (
                          <button
                            type="button"
                            onClick={() => handleTogglePost(post.id)}
                            className="mt-1 block text-xs font-medium text-emerald-600 hover:underline"
                          >
                            {isExpanded ? "Свернуть" : "Читать далее"}
                          </button>
                        )}
                        {/* Комментарии под постами временно скрыты (по запросу). */}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          </div>

          {/* Форма нового сообщения / заглушка без подписки */}
          {currentUser && !canWriteGeneralChat ? (
            <div className="mt-auto shrink-0 space-y-2 border-t border-gray-200 bg-amber-50/80 p-4">
              {createError ? (
                <p className="text-[11px] text-red-600">{createError}</p>
              ) : null}
              <p className="text-xs text-slate-700">
                {currentUser.isBlocked
                  ? "Ваш аккаунт заблокирован. Публикация в общем чате недоступна."
                  : isPaidGateMode()
                    ? "Общий чат доступен для чтения. Чтобы писать, оформите тариф Pro+."
                    : currentUser.subscriptionPlan === "pro"
                      ? "На тарифе Pro общий чат доступен только для чтения. Перейдите на Pro+, чтобы писать."
                      : "На тарифе Free общий чат доступен только для чтения. Оформите Pro+, чтобы писать."}
              </p>
              {!currentUser.isBlocked ? (
                isPaidGateMode() ? (
                  <button
                    type="button"
                    onClick={() => openPaywallDrawer({ intent: "chat" })}
                    className="inline-flex items-center rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700"
                  >
                    Оформить Pro+
                  </button>
                ) : (
                  <Link
                    href="/subscription?reason=chat"
                    className="inline-flex items-center rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700"
                  >
                    Оформить Pro+
                  </Link>
                )
              ) : null}
            </div>
          ) : (
            <form
              onSubmit={handleCreatePost}
              className="mt-auto shrink-0 space-y-2 border-t border-gray-200 bg-gray-50 p-4"
            >
              <textarea
                ref={newPostBodyRef}
                value={newPostBody}
                onChange={(e) =>
                  setNewPostBody(e.target.value.slice(0, 1000))
                }
                placeholder={
                  currentUser
                    ? "Введите сообщение"
                    : "Войди, чтобы написать сообщение…"
                }
                disabled={!!currentUser && !canWriteGeneralChat}
                className="min-h-[80px] w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                onFocus={(e) => scrollComposerIntoView(e.currentTarget)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!creating && newPostBody.trim() && canWriteGeneralChat) {
                      handleCreatePost(e as any);
                    }
                  }
                }}
              />
              {editingPostId ? (
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-amber-600">
                    Режим редактирования
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPostId(null);
                      setNewPostBody("");
                    }}
                    className="text-[11px] font-medium text-slate-600 hover:underline"
                  >
                    Отмена
                  </button>
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {newPostBody.length}/1000
                </span>
                <button
                  type="submit"
                  disabled={creating || (!!currentUser && !canWriteGeneralChat)}
                  className="inline-flex items-center rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-60"
                >
                  {creating
                    ? "Отправляем..."
                    : editingPostId
                      ? "Сохранить"
                      : "Отправить"}
                </button>
              </div>
              {createError && (
                <p className="text-[11px] text-red-600">{createError}</p>
              )}
            </form>
          )}
        </section>
</>
  );
}
