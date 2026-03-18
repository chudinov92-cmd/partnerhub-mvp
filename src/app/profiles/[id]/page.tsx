"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type PublicProfile = {
  id: string;
  full_name: string | null;
  country: string | null;
  city: string | null;
  industry: string | null;
  industry_other: string | null;
  subindustry: string | null;
  role_title: string | null;
  experience_years: number | null;
  skills: string | null;
  looking_for: string | null;
  can_help_with: string | null;
  interested_in: string | null;
};

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>();
  const profileId = params?.id;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(
            "id, full_name, country, city, industry, industry_other, subindustry, role_title, experience_years, skills, looking_for, can_help_with, interested_in",
          )
          .eq("id", profileId)
          .maybeSingle();

        if (error) throw error;
        setProfile((data as PublicProfile) ?? null);
      } catch (err: any) {
        setError(err.message ?? "Не удалось загрузить профиль");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [profileId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Загрузка профиля…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Профиль не найден.</p>
      </div>
    );
  }

  const industryLabel =
    profile.industry === "Другое" && profile.industry_other
      ? profile.industry_other
      : profile.industry;

  return (
    <div className="flex min-h-screen justify-center bg-slate-50 px-3 py-6">
      <div className="w-full max-w-2xl space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {profile.full_name || "Пользователь"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {profile.city || profile.country || "Локация не указана"}
            </p>
          </div>
          <div className="ml-4 flex gap-2">
            <Link
              href="/"
              className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Назад
            </Link>
            <Link
              href={`/?chat=${profile.id}`}
              className="inline-flex items-center rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Написать
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Отрасль
            </p>
            <p className="text-sm text-slate-900">
              {industryLabel || "Не указана"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Подотрасль
            </p>
            <p className="text-sm text-slate-900">
              {profile.subindustry || "Не указана"}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Профессия
            </p>
            <p className="text-sm text-slate-900">
              {profile.role_title || "Не указана"}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Стаж
            </p>
            <p className="text-sm text-slate-900">
              {profile.experience_years != null
                ? `${profile.experience_years} лет`
                : "Не указан"}
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Что умеет
            </p>
            <p className="mt-1 text-sm text-slate-900 whitespace-pre-line">
              {profile.skills || "Не указано"}
            </p>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Что ищет на платформе
            </p>
            <p className="mt-1 text-sm text-slate-900 whitespace-pre-line">
              {profile.looking_for || "Не указано"}
            </p>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Чем может помочь другим
            </p>
            <p className="mt-1 text-sm text-slate-900 whitespace-pre-line">
              {profile.can_help_with || "Не указано"}
            </p>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Какие специалисты интересуют
            </p>
            <p className="mt-1 text-sm text-slate-900 whitespace-pre-line">
              {profile.interested_in || "Не указано"}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

