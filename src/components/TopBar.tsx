"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { OPEN_SUPPORT_CHAT_EVENT } from "@/lib/support";
import { authGetUser, authOnAuthStateChange, authSignOut } from "@/services/authService";
import {
  countContactsForOwner,
  fetchTopBarProfile,
  updateProfileLastSeen,
} from "@/services/profileService";
import { PROFILE_CONTACTS_CHANGED_EVENT } from "@/lib/contactEvents";
import { USEFUL_CONTACTS_CHANGED_EVENT } from "@/lib/usefulContactEvents";
import { fetchUsefulContactsCount } from "@/services/statsService";
import { TopBarCitySelect } from "@/components/TopBarCitySelect";
import { useSelectedCity } from "@/contexts/SelectedCityContext";
import Image from "next/image";

const LAST_SEEN_PING_MS = 60000;

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
  const [usefulContactsCount, setUsefulContactsCount] = useState<number | null>(
    null,
  );
  const [usefulContactsLoading, setUsefulContactsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mapContactsActive, setMapContactsActive] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { selectedCity } = useSelectedCity();

  const loadUsefulContactsCount = useCallback(async () => {
    setUsefulContactsLoading(true);
    try {
      const count = await fetchUsefulContactsCount(selectedCity);
      setUsefulContactsCount(count);
    } catch (e) {
      console.error("Failed to load useful contacts count", e);
      setUsefulContactsCount(null);
    } finally {
      setUsefulContactsLoading(false);
    }
  }, [selectedCity]);

  useEffect(() => {
    void loadUsefulContactsCount();
  }, [loadUsefulContactsCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const refresh = () => void loadUsefulContactsCount();
    window.addEventListener(USEFUL_CONTACTS_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener(USEFUL_CONTACTS_CHANGED_EVENT, refresh);
    };
  }, [loadUsefulContactsCount]);

  const openSupport = () => {
    setMenuOpen(false);
    if (pathname === "/") {
      window.dispatchEvent(new CustomEvent(OPEN_SUPPORT_CHAT_EVENT));
      return;
    }
    router.push("/?support=1");
  };
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const read = () => {
      const params = new URLSearchParams(window.location.search);
      setMapContactsActive(params.get("mapContacts") === "1");
    };

    read();

    const onLocationChange = () => read();

    const origPush = history.pushState;
    const origReplace = history.replaceState;

    history.pushState = function (
      this: History,
      ...args: Parameters<History["pushState"]>
    ) {
      const ret = origPush.apply(this, args as any);
      window.dispatchEvent(new Event("locationchange"));
      return ret;
    } as any;

    history.replaceState = function (
      this: History,
      ...args: Parameters<History["replaceState"]>
    ) {
      const ret = origReplace.apply(this, args as any);
      window.dispatchEvent(new Event("locationchange"));
      return ret;
    } as any;

    window.addEventListener("popstate", onLocationChange);
    window.addEventListener("locationchange", onLocationChange);

    return () => {
      history.pushState = origPush;
      history.replaceState = origReplace;
      window.removeEventListener("popstate", onLocationChange);
      window.removeEventListener("locationchange", onLocationChange);
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await authGetUser();

        if (!user) {
          setIsAuthed(false);
          setFullName(null);
          setMyProfileId(null);
          return;
        }

        setIsAuthed(true);

        const p = await fetchTopBarProfile(user.id);
        const name = p?.full_name ?? null;
        setFullName(name);
        setMyProfileId(p?.id ?? null);
      } finally {
        setLoading(false);
      }
    };

    void load();

    const {
      data: { subscription },
    } = authOnAuthStateChange((_event, session) => {
      const user = session?.user;
      if (user) {
        setIsAuthed(true);
        void fetchTopBarProfile(user.id)
          .then((p) => {
            setFullName(p?.full_name ?? null);
            setMyProfileId(p?.id ?? null);
          })
          .catch(() => {
            setFullName(null);
            setMyProfileId(null);
          });
        return;
      }
      setIsAuthed(false);
      setFullName(null);
      setMyProfileId(null);
      setContactCount(0);
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
    countContactsForOwner(myProfileId)
      .then((n) => setContactCount(n))
      .catch(() => setContactCount(0));
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
        await updateProfileLastSeen(myProfileId);
      } catch {
        // best-effort
      }
    };

    ping();
    const interval = setInterval(ping, LAST_SEEN_PING_MS);

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
    <header className="sticky top-0 z-[1500] shrink-0 border-b border-gray-200 bg-white pt-[env(safe-area-inset-top,0px)] shadow-sm">
      <div className="grid h-14 min-h-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 md:px-4">
      <div className="flex min-w-0 flex-col gap-0.5 justify-self-start sm:flex-row sm:items-center sm:gap-3">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2"
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
        <p className="truncate text-[10px] leading-tight text-slate-600 sm:text-xs">
          <span className="hidden md:inline">Установлено полезных контактов: </span>
          <span className="md:hidden">Полезных контактов: </span>
          {usefulContactsLoading ? (
            <span className="text-slate-400">…</span>
          ) : usefulContactsCount != null ? (
            <span className="font-semibold text-slate-800">
              {usefulContactsCount}
            </span>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </p>
      </div>

      <div className="justify-self-center">
        <TopBarCitySelect />
      </div>

      <div className="flex items-center justify-end gap-2 md:gap-3">
        <button
          type="button"
          onClick={() => {
            if (!isAuthed || loading) return;
            if (typeof window === "undefined") return;
            const url = new URL(window.location.href);
            if (mapContactsActive) url.searchParams.delete("mapContacts");
            else url.searchParams.set("mapContacts", "1");
            router.replace(url.pathname + url.search);
          }}
          disabled={!isAuthed || loading}
          className="relative rounded-lg p-2 text-slate-600 transition-colors hover:bg-gray-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
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
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/subscription");
                    }}
                    className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-slate-700 hover:bg-gray-50"
                  >
                    Подписка
                    <span className="rounded bg-[#FDE047] px-1 text-[10px] font-bold text-slate-900">
                      Pro
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={openSupport}
                    className="flex w-full items-center px-3 py-2 text-left text-slate-700 hover:bg-gray-50"
                  >
                    Поддержка
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/about");
                    }}
                    className="flex w-full items-center px-3 py-2 text-left text-slate-700 hover:bg-gray-50"
                  >
                    О проекте
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setMenuOpen(false);
                      await authSignOut();
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openSupport}
                className="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-gray-100"
              >
                Поддержка
              </button>
              <Link
                href="/auth"
                className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700"
              >
                Войти
              </Link>
            </div>
          )}
        </div>
      </div>
      </div>
    </header>
  );
}
