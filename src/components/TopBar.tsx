"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export function TopBar() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [fullName, setFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

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
          return;
        }

        setIsAuthed(true);

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        const name =
          (profile as { full_name: string | null } | null)?.full_name ?? null;
        setFullName(name);
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

  return (
    <header className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-3 md:px-4">
      <Link href="/" className="text-sm font-semibold text-slate-900">
        PartnerHub
      </Link>

      <div className="relative">
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

