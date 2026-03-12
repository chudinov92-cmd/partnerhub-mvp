"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";

const PartnerMap = dynamic(
  () => import("@/components/PartnerMap").then((m) => m.PartnerMap),
  { ssr: false },
);

type Post = {
  id: string;
  title: string;
  body: string | null;
  city: string | null;
  created_at: string;
  specialty_id: string | null;
  author_id: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  city: string | null;
  rating_avg: number | null;
  rating_count: number | null;
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
            .select("id, title, body, city, created_at, specialty_id, author_id")
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("profiles")
            .select("id, full_name, city, rating_avg, rating_count")
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
          title: "Сообщение в общем чате",
          body,
          city: currentUser.city,
        })
        .select("id, title, body, city, created_at, specialty_id, author_id")
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

  return (
    <div className="flex min-h-screen bg-slate-50">
      <main className="flex w-full flex-col gap-4 py-3 md:flex-row md:gap-3 lg:gap-4">
        {/* Левая колонка: лента запросов, как список чата */}
        <section className="w-full rounded-2xl bg-white p-4 shadow-sm md:w-[320px] md:flex-shrink-0 md:p-5">
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
          <div className="mb-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
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

                return (
                  <li
                    key={post.id}
                    className="cursor-pointer rounded-2xl border border-slate-100 bg-slate-50/70 p-3 transition hover:border-sky-100 hover:bg-sky-50/40"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-slate-900">
                        {post.title}
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
        <section className="order-last flex-1 md:order-none md:px-1 lg:px-2 flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Специалисты на карте
            </h2>
            <span className="text-[11px] text-slate-500">Пермь</span>
          </div>
          <div className="flex-1">
            <PartnerMap />
          </div>
        </section>

        {/* Правая колонка: список чатов / специалистов */}
        <aside className="w-full rounded-2xl bg-white p-4 shadow-sm md:w-[260px] md:flex-shrink-0 md:p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Мои чаты
          </h2>

          {!loading && profiles.length === 0 && (
            <p className="text-sm text-slate-500">
              Профилей ещё нет. Зарегистрируйся под разными аккаунтами, и мы
              позже добавим редактирование профиля и карту.
            </p>
          )}

          <ul className="space-y-2">
            {profiles.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {p.full_name || "Без имени"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {p.city || "Город не указан"}
                  </p>
                </div>
                {p.rating_count && p.rating_count > 0 ? (
                  <span className="text-xs font-medium text-amber-500">
                    ★ {p.rating_avg?.toFixed(1)}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">нет оценок</span>
                )}
              </li>
            ))}
          </ul>
        </aside>
      </main>
    </div>
  );
}
