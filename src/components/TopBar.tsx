"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { PROFILE_CONTACTS_CHANGED_EVENT } from "@/lib/contactEvents";
import { TopBarCitySelect } from "@/components/TopBarCitySelect";
import Image from "next/image";

function IconUsers({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function TopBar() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [fullName, setFullName] = useState<string | null>(null);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [contactCount, setContactCount] = useState(0);
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

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        load();
      } else {
        setIsAuthed(false);
        setFullName(null);
        setMyProfileId(null);
        setContactCount(0);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const reloadContactCount = useCallback(() => {
    if (!myProfileId) {
      setContactCount(0);
      return;
    }
    supabase
      .from("profile_contacts")
      .select("contact_profile_id", { count: "exact", head: true })
      .eq("owner_id", myProfileId)
      .then(({ count, error }) => {
        if (error) {
          setContactCount(0);
          return;
        }
        setContactCount(count ?? 0);
      });
  }, [myProfileId]);

  useEffect(() => {
    reloadContactCount();
  }, [reloadContactCount]);

  useEffect(() => {
    const onContactsChanged = () => reloadContactCount();
    window.addEventListener(PROFILE_CONTACTS_CHANGED_EVENT, onContactsChanged);
    return () =>
      window.removeEventListener(
        PROFILE_CONTACTS_CHANGED_EVENT,
        onContactsChanged,
      );
  }, [reloadContactCount]);

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
        // best-effort
      }
    };

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

  const displayInitial =
    fullName?.trim()?.[0]?.toUpperCase() ?? "П";

  return (
    <header className="sticky top-0 z-[1500] grid min-h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-gray-200 bg-white px-3 py-2 shadow-sm md:px-4">
      <Link
        href="/"
        className="flex min-w-0 items-center gap-2 justify-self-start"
      >
        <Image
          src="/zeip-logo.svg"
          alt="Zeip"
          width={36}
          height={36}
          className="h-9 w-9 shrink-0"
          priority
        />
        <span className="truncate text-xl font-semibold text-slate-900">
          Zeip
        </span>
      </Link>

      <div className="justify-self-center">
        <TopBarCitySelect />
      </div>

      <div className="flex items-center justify-end gap-2 md:gap-3">
        <button
          type="button"
          onClick={() => router.push("/?contacts=1")}
          className="relative rounded-lg p-2 text-slate-600 transition-colors hover:bg-gray-100 hover:text-slate-900"
          aria-label="Контакты"
        >
          <IconUsers className="h-5 w-5" />
          {contactCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-1 text-[10px] font-bold text-white">
              {contactCount > 9 ? "9+" : contactCount}
            </span>
          ) : null}
        </button>

        <div className="relative" ref={menuRef}>
          {loading ? null : isAuthed ? (
            <>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-gray-100"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-gray-200 bg-slate-900 text-sm font-medium text-white">
                  {displayInitial}
                </span>
                <span className="hidden max-w-[120px] truncate text-sm font-medium text-slate-900 md:inline-block">
                  {fullName ? fullName.split(" ")[0] : "Профиль"}
                </span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-11 z-50 w-40 rounded-xl border border-gray-200 bg-white py-1 text-xs shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/profile");
                    }}
                    className="flex w-full items-center px-3 py-2 text-left text-slate-700 hover:bg-gray-50"
                  >
                    Профиль
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/?contacts=1");
                    }}
                    className="flex w-full items-center px-3 py-2 text-left text-slate-700 hover:bg-gray-50"
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
                      setMyProfileId(null);
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
              className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700"
            >
              Войти
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
