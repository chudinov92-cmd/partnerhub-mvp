"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export function TopBar() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [fullName, setFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

    load();
  }, []);

  return (
    <header className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-3 md:px-4">
      <Link href="/" className="text-sm font-semibold text-slate-900">
        PartnerHub
      </Link>

      <div>
        {loading ? null : isAuthed ? (
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          >
            <span>
              {fullName ? fullName.split(" ")[0] : "Профиль"}
            </span>
          </Link>
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

