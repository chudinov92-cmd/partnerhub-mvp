"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";

const PartnerMap = dynamic(
  () => import("@/components/PartnerMap").then((m) => m.PartnerMap),
  { ssr: false },
);

type Post = {
  id: string;
  body: string | null;
  city: string | null;
  created_at: string;
  specialty_id: string | null;
  author_id: string;
  // Структура автора приходит из Supabase как вложенный объект/массив,
  // для простоты типизируем как any и обрабатываем на уровне рендера.
  author: any;
};

type Profile = {
  id: string;
  full_name: string | null;
  city: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  user_specialties?: any;
};

type Specialty = {
  id: string;
  name: string;
};

type CurrentUser = {
  profileId: string;
  fullName: string | null;
  city: string | null;
};

type ChatMessage = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
};

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [feedSpecialtyIds, setFeedSpecialtyIds] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedOpen, setFeedOpen] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(
    () => new Set(),
  );
  const [newPostBody, setNewPostBody] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [activeChatUser, setActiveChatUser] = useState<Profile | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatSending, setChatSending] = useState(false);
  const [unreadByUser, setUnreadByUser] = useState<Record<string, number>>({});
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        setLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        const [
          { data: postsData, error: postsError },
          { data: profilesData, error: profilesError },
          { data: specsData, error: specsError },
          currentProfileResult,
        ] = await Promise.all([
          supabase
            .from("posts")
            .select(
              "id, body, city, created_at, specialty_id, author_id, author:profiles(full_name, user_specialties(is_primary, specialties(name)))",
            )
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("profiles")
            .select(
              "id, full_name, city, rating_avg, rating_count, user_specialties(is_primary, specialties(name))",
            )
            .limit(20),
          supabase
            .from("specialties")
            .select("id, name")
            .order("name", { ascending: true }),
          user
            ? supabase
                .from("profiles")
                .select("id, full_name, city")
                .eq("auth_user_id", user.id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ] as const);

        if (postsError) throw postsError;
        if (profilesError) throw profilesError;
        if (specsError) throw specsError;

        setPosts(postsData ?? []);
        setProfiles(profilesData ?? []);
        setSpecialties(specsData ?? []);

        if (user && !currentProfileResult.error && currentProfileResult.data) {
          const p = currentProfileResult.data as {
            id: string;
            full_name: string | null;
            city: string | null;
          };
          setCurrentUser({
            profileId: p.id,
            fullName: p.full_name,
            city: p.city,
          });
        } else {
          setCurrentUser(null);
        }

        // подгружаем сохранённые фильтры из localStorage
        if (typeof window !== "undefined") {
          const raw = window.localStorage.getItem("feed_specialties");
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as string[];
              setFeedSpecialtyIds(parsed);
            } catch {
              // ignore
            }
          }
        }
      } catch (err: any) {
        setError(err.message ?? "Не удалось загрузить данные");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Периодически подтягиваем новые сообщения для общего чата,
  // чтобы поведение было ближе к мессенджеру.
  useEffect(() => {
    const interval = setInterval(async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(
          "id, body, city, created_at, specialty_id, author_id, author:profiles(full_name, user_specialties(is_primary, specialties(name)))",
        )
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        setPosts(data as Post[]);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Реальное время для личных сообщений
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new as ChatMessage & { chat_id: string };

          // Игнорируем свои же сообщения (мы их уже добавили локально)
          if (msg.sender_id === currentUser.profileId) return;

          try {
            // Проверяем, что текущий пользователь участник этого чата
            const { data: members, error } = await supabase
              .from("chat_members")
              .select("user_id")
              .eq("chat_id", (msg as any).chat_id);

            if (error || !members) return;

            const memberIds = members.map((m) => m.user_id as string);
            if (!memberIds.includes(currentUser.profileId)) return;

            const otherId =
              memberIds.find((id) => id !== currentUser.profileId) ??
              currentUser.profileId;

            // Если этот чат сейчас открыт — просто добавляем сообщение в окно
            if (activeChatId === (msg as any).chat_id) {
              setChatMessages((prev) => [...prev, msg]);
            } else {
              // Иначе увеличиваем счётчик непрочитанных для собеседника
              setUnreadByUser((prev) => ({
                ...prev,
                [otherId]: (prev[otherId] || 0) + 1,
              }));
            }
          } catch {
            // тихо игнорируем ошибки realtime-обработчика
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, activeChatId]);

  const filteredPosts = useMemo(() => {
    if (!feedSpecialtyIds.length) return posts;
    return posts.filter((p) =>
      p.specialty_id ? feedSpecialtyIds.includes(p.specialty_id) : false,
    );
  }, [posts, feedSpecialtyIds]);

  const visiblePosts = filteredPosts;

  const handleTogglePost = (id: string) => {
    setExpandedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveFeed = (ids: string[]) => {
    setFeedSpecialtyIds(ids);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("feed_specialties", JSON.stringify(ids));
    }
    setFeedOpen(false);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setCreateError("Нужно войти, чтобы написать пост.");
      return;
    }
    if (!newPostBody.trim()) {
      setCreateError("Напишите текст сообщения.");
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const body = newPostBody.trim().slice(0, 1000);
      const { data, error } = await supabase
        .from("posts")
        .insert({
          author_id: currentUser.profileId,
          title: "Общий чат",
          body,
          city: currentUser.city,
        })
        .select(
          "id, body, city, created_at, specialty_id, author_id, author:profiles(full_name, user_specialties(is_primary, specialties(name)))",
        )
        .single();

      if (error) throw error;

      setPosts((prev) => {
        const next = [data as Post, ...prev];
        return next.slice(0, 20);
      });
      setNewPostBody("");
    } catch (err: any) {
      setCreateError(err.message ?? "Не удалось отправить сообщение.");
    } finally {
      setCreating(false);
    }
  };

  const openChatWithProfile = async (profile: Profile) => {
    if (!currentUser) {
      setChatError("Нужно войти, чтобы отправлять сообщения.");
      return;
    }

    setActiveChatUser(profile);
    setChatError(null);
    setChatLoading(true);

    try {
      // Ищем существующий личный чат с этим пользователем
      const { data: chatsData, error: chatsError } = await supabase
        .from("chats")
        .select("id, is_group, chat_members(user_id)")
        .eq("is_group", false);

      if (chatsError) throw chatsError;

      let chatId: string | null = null;

      if (chatsData) {
        for (const chat of chatsData as any[]) {
          const members = chat.chat_members as { user_id: string }[];
          const memberIds = members.map((m) => m.user_id);
          if (
            memberIds.includes(currentUser.profileId) &&
            memberIds.includes(profile.id)
          ) {
            chatId = chat.id as string;
            break;
          }
        }
      }

      // Если чата нет — создаём
      if (!chatId) {
        const { data: newChat, error: createChatError } = await supabase
          .from("chats")
          .insert({
            is_group: false,
            title: null,
            created_by: currentUser.profileId,
          })
          .select("id")
          .single();

        if (createChatError) throw createChatError;

        chatId = (newChat as any).id as string;

        const { error: membersError } = await supabase
          .from("chat_members")
          .insert([
            { chat_id: chatId, user_id: currentUser.profileId },
            { chat_id: chatId, user_id: profile.id },
          ]);

        if (membersError) throw membersError;
      }

      setActiveChatId(chatId);

      // Загружаем последние 5 сообщений
      const { data: msgsData, error: msgsError } = await supabase
        .from("messages")
        .select("id, content, sender_id, created_at")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (msgsError) throw msgsError;

      const normalized = (msgsData ?? []).reverse() as ChatMessage[];
      setChatMessages(normalized);
      setUnreadByUser((prev) => ({ ...prev, [profile.id]: 0 }));
    } catch (err: any) {
      setChatError(err.message ?? "Не удалось открыть диалог.");
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !activeChatId || !chatInput.trim()) return;

    setChatSending(true);
    setChatError(null);

    try {
      const content = chatInput.trim().slice(0, 1000);

      const { data, error } = await supabase
        .from("messages")
        .insert({
          chat_id: activeChatId,
          sender_id: currentUser.profileId,
          content,
        })
        .select("id, content, sender_id, created_at")
        .single();

      if (error) throw error;

      setChatMessages((prev) => [...prev, data as ChatMessage]);
      setChatInput("");
    } catch (err: any) {
      setChatError(err.message ?? "Не удалось отправить сообщение.");
    } finally {
      setChatSending(false);
    }
  };

  // автоскролл к последнему сообщению при изменении списка
  useEffect(() => {
    if (!activeChatUser) return;
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chatMessages, activeChatUser]);

  return (
    <div className="flex h-[calc(100vh-3rem)] bg-slate-50">
      <main className="flex h-full w-full flex-col gap-4 py-3 md:flex-row md:gap-3 lg:gap-4">
        {/* Левая колонка: лента запросов, как список чата */}
        <section className="flex h-full w-full flex-col rounded-2xl bg-white p-4 shadow-sm md:w-[320px] md:flex-shrink-0 md:p-5">
          <header className="mb-3 flex items-center justify-between gap-2">
            <h1 className="text-base font-semibold text-slate-900">
              Общий чат
            </h1>
            <button
              type="button"
              onClick={() => setFeedOpen((v) => !v)}
              className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-sky-300 hover:text-sky-700"
            >
              Настроить ленту
            </button>
          </header>

          {loading && <p className="text-sm text-slate-500">Загрузка...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!loading && posts.length === 0 && (
            <p className="text-sm text-slate-500">
              Пока нет запросов. Создай первый пост позже — мы добавим форму.
            </p>
          )}

          {/* Настройка ленты */}
          {feedOpen && (
            <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-medium text-slate-700">
                Показать посты специалистов из выбранных сфер:
              </p>
              <div className="mb-2 max-h-32 space-y-1 overflow-y-auto pr-1">
                {specialties.map((s) => {
                  const checked = feedSpecialtyIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 text-xs text-slate-700"
                    >
                      <input
                        type="checkbox"
                        className="h-3 w-3 rounded border-slate-300 text-sky-600"
                        checked={checked}
                        onChange={(e) => {
                          const next = new Set(feedSpecialtyIds);
                          if (e.target.checked) next.add(s.id);
                          else next.delete(s.id);
                          handleSaveFeed(Array.from(next));
                        }}
                      />
                      <span>{s.name}</span>
                    </label>
                  );
                })}
                {!specialties.length && (
                  <p className="text-xs text-slate-400">
                    Категории ещё не настроены.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Список постов с прокруткой */}
          <div className="mb-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            <ul className="space-y-2">
              {visiblePosts.map((post) => {
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
                const specs = authorObj?.user_specialties ?? [];
                const spec =
                  specs.length > 0
                    ? (
                        specs.find(
                          (s: any) => s.is_primary && s.specialties?.name,
                        ) ||
                        specs.find((s: any) => s.specialties?.name)
                      )?.specialties?.name
                    : null;

                return (
                  <li
                    key={post.id}
                    className="cursor-pointer rounded-2xl border border-slate-100 bg-slate-50/70 p-3 transition hover:border-sky-100 hover:bg-sky-50/40"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-slate-900">
                        {authorName}
                        {spec ? (
                          <span className="ml-1 text-xs font-normal text-slate-500">
                            — {spec}
                          </span>
                        ) : null}
                      </h2>
                      {post.city && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          {post.city}
                        </span>
                      )}
                    </div>
                    {body && (
                      <p className="text-xs text-slate-600">{text}</p>
                    )}
                    {shouldTruncate && (
                      <button
                        type="button"
                        onClick={() => handleTogglePost(post.id)}
                        className="mt-1 text-[11px] font-medium text-sky-700 hover:underline"
                      >
                        {isExpanded ? "Свернуть" : "Читать далее"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Форма нового сообщения */}
          <form onSubmit={handleCreatePost} className="space-y-2">
            <textarea
              value={newPostBody}
              onChange={(e) =>
                setNewPostBody(e.target.value.slice(0, 1000))
              }
              rows={3}
              placeholder={
                currentUser
                  ? "Напиши, кого или что ты ищешь…"
                  : "Войди, чтобы написать сообщение…"
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {newPostBody.length}/1000
              </span>
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-sky-700 disabled:opacity-60"
              >
                {creating ? "Отправляем..." : "Отправить"}
              </button>
            </div>
            {createError && (
              <p className="text-[11px] text-red-600">{createError}</p>
            )}
          </form>
        </section>

        {/* Центр: карта во всю высоту */}
        <section className="order-last flex h-full flex-1 flex-col md:order-none md:px-1 lg:px-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Специалисты на карте
            </h2>
            <span className="text-[11px] text-slate-500">Пермь</span>
          </div>
          <div className="min-h-0 flex-1">
            <PartnerMap />
          </div>
        </section>

        {/* Правая колонка: список чатов / специалистов */}
        <aside className="flex h-full w-full flex-col rounded-2xl bg-white p-4 shadow-sm md:w-[260px] md:flex-shrink-0 md:p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Мои чаты
          </h2>

          {!loading && profiles.length === 0 && (
            <p className="text-sm text-slate-500">
              Профилей ещё нет. Зарегистрируйся под разными аккаунтами, и мы
              позже добавим редактирование профиля и карту.
            </p>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <ul className="space-y-2">
              {profiles.map((p) => (
                <li
                  key={p.id}
                  onClick={() => openChatWithProfile(p)}
                  className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2 transition hover:border-sky-200 hover:bg-sky-50/60"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {p.full_name || "Без имени"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {p.city || "Город не указан"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {unreadByUser[p.id] && unreadByUser[p.id] > 0 && (
                      <span className="inline-flex min-w-[18px] justify-center rounded-full bg-sky-600 px-1 text-[10px] font-semibold text-white">
                        +{unreadByUser[p.id]}
                      </span>
                    )}
                    {p.rating_count && p.rating_count > 0 ? (
                      <span className="text-xs font-medium text-amber-500">
                        ★ {p.rating_avg?.toFixed(1)}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Окно диалога поверх карты и списка чатов */}
        {activeChatUser && (
          <div className="pointer-events-auto fixed top-16 right-3 z-[1000] flex h-[380px] w-full max-w-sm flex-col rounded-2xl border border-slate-200 bg-white shadow-xl md:right-[280px]">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {activeChatUser.full_name || "Без имени"}
                </p>
                <p className="text-[11px] text-slate-500">
                  {(() => {
                    const specs = (activeChatUser.user_specialties ??
                      []) as any[];
                    if (!specs.length) {
                      return activeChatUser.city || "Город не указан";
                    }
                    const spec =
                      specs.find(
                        (s: any) => s.is_primary && s.specialties?.name,
                      ) ||
                      specs.find((s: any) => s.specialties?.name);
                    return spec?.specialties?.name || "Специализация не указана";
                  })()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveChatUser(null);
                  setActiveChatId(null);
                  setChatMessages([]);
                  setChatError(null);
                }}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden px-3 py-2">
              <div
                ref={chatScrollRef}
                className="mb-2 flex-1 overflow-y-auto space-y-2"
              >
                {chatLoading ? (
                  <p className="text-xs text-slate-500">
                    Загружаем сообщения...
                  </p>
                ) : (
                  <>
                    {chatMessages.map((m) => (
                      <div
                        key={m.id}
                        className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-xs ${
                          m.sender_id === currentUser?.profileId
                            ? "ml-auto bg-sky-600 text-white"
                            : "mr-auto bg-slate-50/70 text-slate-900"
                        }`}
                      >
                        <p>{m.content}</p>
                      </div>
                    ))}
                    {chatMessages.length === 0 && !chatLoading && (
                      <p className="text-xs text-slate-400">
                        Пока нет сообщений. Напишите что‑нибудь первым.
                      </p>
                    )}
                  </>
                )}
              </div>

              {chatError && (
                <p className="mb-1 text-[11px] text-red-600">{chatError}</p>
              )}

              <form
                onSubmit={handleSendChatMessage}
                className="mt-1 space-y-1 border-t border-slate-200 pt-2"
              >
                <textarea
                  value={chatInput}
                  onChange={(e) =>
                    setChatInput(e.target.value.slice(0, 1000))
                  }
                  rows={4}
                  placeholder="Напишите сообщение…"
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!chatSending && chatInput.trim()) {
                        handleSendChatMessage(e as any);
                      }
                    }
                  }}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    {chatInput.length}/1000
                  </span>
                  <button
                    type="submit"
                    disabled={chatSending || !chatInput.trim()}
                    className="inline-flex items-center rounded-lg bg-sky-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-sky-700 disabled:opacity-60"
                  >
                    {chatSending ? "Отправляем..." : "Отправить"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
