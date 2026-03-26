"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export function TopBar() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [fullName, setFullName] = useState<string | null>(null);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setIsAuthed(false);
          setFullName(null);
          setMyProfileId(null);
          return;
        }

        setIsAuthed(true);

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        const p = profile as { id: string; full_name: string | null } | null;
        const name = p?.full_name ?? null;
        setFullName(name);
        setMyProfileId(p?.id ?? null);
      } finally {
        setLoading(false);
      }
    };

    // первый запрос при монтировании
    load();

    // слушаем изменения состояния авторизации,
    // чтобы кнопка менялась сразу после логина/выхода
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // пользователь залогинен — перезагружаем профиль
        load();
      } else {
        // разлогинился
        setIsAuthed(false);
        setFullName(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Heartbeat for "online" status: update last_seen_at while user is active.
  useEffect(() => {
    if (!myProfileId) return;

    let alive = true;

    const ping = async () => {
      if (!alive) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible")
        return;
      try {
        await supabase
          .from("profiles")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", myProfileId);
      } catch {
        // best-effort; do not surface to UI
      }
    };

    // Ping immediately and then periodically.
    ping();
    const interval = setInterval(ping, 30000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", ping);

    return () => {
      alive = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", ping);
    };
  }, [myProfileId]);

  // Закрытие меню профиля по клику вне и по Esc
  useEffect(() => {
    if (!menuOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  return (
    <header className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-3 md:px-4">
      <Link href="/" className="text-sm font-semibold text-slate-900">
        Zeip
      </Link>

      <div className="relative" ref={menuRef}>
        {loading ? null : isAuthed ? (
          <>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            >
              <span>{fullName ? fullName.split(" ")[0] : "Профиль"}</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 z-50 w-40 rounded-xl border border-slate-200 bg-white py-1 text-xs shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/profile");
                  }}
                  className="flex w-full items-center px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                >
                  Профиль
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/?contacts=1");
                  }}
                  className="flex w-full items-center px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                >
                  Контакты
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setMenuOpen(false);
                    await supabase.auth.signOut();
                    setIsAuthed(false);
                    setFullName(null);
                    router.push("/auth");
                  }}
                  className="flex w-full items-center px-3 py-2 text-left text-red-600 hover:bg-red-50"
                >
                  Выйти
                </button>
              </div>
            )}
          </>
        ) : (
          <Link
            href="/auth"
            className="inline-flex items-center rounded-full bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
          >
            Войти
          </Link>
        )}
      </div>
    </header>
  );
}

