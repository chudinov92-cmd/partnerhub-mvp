"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AdminRole = "super_admin" | "moderator" | "support";

type AdminRow = {
  auth_user_id: string;
  role: AdminRole;
};

function NavItem({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 ${
        active
          ? "bg-emerald-600 text-white"
          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [admin, setAdmin] = useState<AdminRow | null>(null);

  useEffect(() => {
    let alive = true;
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        if (!user) {
          setError("Нужно войти в аккаунт.");
          return;
        }

        const { data, error: adminErr } = await supabase
          .from("admin_users")
          .select("auth_user_id, role")
          .eq("auth_user_id", user.id)
          .maybeSingle();
        if (adminErr) throw adminErr;
        if (!data) {
          setError("Доступ запрещён: у вас нет прав администратора.");
          return;
        }

        if (!alive) return;
        setAdmin(data as AdminRow);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Не удалось открыть админку.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    void init();
    return () => {
      alive = false;
    };
  }, []);

  const nav = useMemo(() => {
    const role = admin?.role ?? null;
    const base = [
      { href: "/admin/users", label: "Пользователи", min: "support" as AdminRole },
      { href: "/admin/posts", label: "Общий чат", min: "moderator" as AdminRole },
      { href: "/admin/reports", label: "Репорты", min: "support" as AdminRole },
      { href: "/admin/analytics", label: "Аналитика", min: "support" as AdminRole },
      { href: "/admin/catalogs", label: "Справочники", min: "super_admin" as AdminRole },
      { href: "/admin/admins", label: "Админы", min: "super_admin" as AdminRole },
    ];
    const rank = (r: AdminRole) =>
      r === "support" ? 1 : r === "moderator" ? 2 : 3;
    if (!role) return base.map((x) => ({ ...x, hidden: false }));
    return base.map((x) => ({
      ...x,
      hidden: rank(role) < rank(x.min),
    }));
  }, [admin?.role]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Загрузка админки…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Админка</h1>
          <p className="mt-2 text-sm text-rose-700">{error}</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Обновить
            </button>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              На карту
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              Zeip Admin
            </p>
            <p className="truncate text-xs text-slate-500">
              Роль: {admin?.role ?? "-"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50"
            >
              На карту
            </Link>
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/auth");
              }}
              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[260px_1fr] lg:gap-6 lg:py-6">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <nav className="flex flex-col gap-1" aria-label="Разделы админки">
            {nav
              .filter((x) => !x.hidden)
              .map((x) => (
                <NavItem
                  key={x.href}
                  href={x.href}
                  label={x.label}
                  active={pathname === x.href}
                />
              ))}
          </nav>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

