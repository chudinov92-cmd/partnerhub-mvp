"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { notifyProfileContactsChanged } from "@/lib/contactEvents";

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
  resources: string | null;
  can_help_with: string | null;
  interested_in: string | null;
  rating_count: number | null;
};

function splitLines(value: string | null | undefined) {
  if (!value) return [];
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>();
  const profileId = params?.id;
  const router = useRouter();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [isContact, setIsContact] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  useEffect(() => {
    if (!profileId) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/auth?redirect=" + encodeURIComponent(`/profiles/${profileId}`));
          return;
        }

        const { data: me } = await supabase
          .from("profiles")
          .select("id, onboarding_completed")
          .eq("auth_user_id", user.id)
          .maybeSingle();
        const myId = (me as { id?: string; onboarding_completed?: boolean } | null)?.id ?? null;
        setCurrentProfileId(myId);

        if (me && !(me as { onboarding_completed?: boolean }).onboarding_completed) {
          router.replace("/onboarding");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select(
            "id, full_name, country, city, industry, industry_other, subindustry, role_title, experience_years, skills, looking_for, resources, can_help_with, interested_in, rating_count, deleted_at",
          )
          .eq("id", profileId)
          .maybeSingle();

        if (error) {
          const msg = String(error.message ?? "");
          if (/deleted_at|column/i.test(msg)) {
            const fallback = await supabase
              .from("profiles")
              .select(
                "id, full_name, country, city, industry, industry_other, subindustry, role_title, experience_years, skills, looking_for, resources, can_help_with, interested_in, rating_count",
              )
              .eq("id", profileId)
              .maybeSingle();
            if (fallback.error) throw fallback.error;
            setProfile((fallback.data as PublicProfile) ?? null);
            return;
          }
          throw error;
        }
        const row = data as (PublicProfile & { deleted_at?: string | null }) | null;
        if (row?.deleted_at) {
          setProfile(null);
          setError("Профиль удалён");
          return;
        }
        setProfile(row ?? null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Не удалось загрузить профиль");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [profileId, router]);

  useEffect(() => {
    if (!profileId || !currentProfileId) {
      setIsContact(false);
      return;
    }
    if (profileId === currentProfileId) {
      setIsContact(false);
      return;
    }
    let alive = true;
    supabase
      .from("profile_contacts")
      .select("contact_profile_id")
      .eq("owner_id", currentProfileId)
      .eq("contact_profile_id", profileId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error && (error as { code?: string }).code !== "PGRST116") {
          console.error("Failed to check contact", error);
          setIsContact(false);
          return;
        }
        setIsContact(!!data);
      });
    return () => {
      alive = false;
    };
  }, [profileId, currentProfileId]);

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
        <p className="text-sm text-slate-500">{error ?? "Профиль не найден."}</p>
      </div>
    );
  }

  const industryLabel =
    profile.industry === "Другое" && profile.industry_other
      ? profile.industry_other
      : profile.industry;
  const interestedProfessionItems = splitLines(profile.interested_in);

  return (
    <div className="flex min-h-screen justify-center bg-slate-50 px-3 py-6">
      <div className="w-full max-w-2xl space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {profile.full_name || "Пользователь"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {profile.city || "Локация не указана"}
            </p>
          </div>
          <div className="ml-4 flex gap-2">
            <Link
              href="/map"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              На карту
            </Link>
          </div>
        </div>

        {profile.role_title ? (
          <p className="text-sm text-slate-700">
            <span className="font-medium">Профессия:</span> {profile.role_title}
          </p>
        ) : null}
        {industryLabel ? (
          <p className="text-sm text-slate-700">
            <span className="font-medium">Отрасль:</span> {industryLabel}
          </p>
        ) : null}
        {profile.skills ? (
          <div>
            <h2 className="text-sm font-medium text-slate-900">О себе</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
              {profile.skills}
            </p>
          </div>
        ) : null}
        {interestedProfessionItems.length > 0 ? (
          <div>
            <h2 className="text-sm font-medium text-slate-900">
              Интересующие профессии
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {interestedProfessionItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-800"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {currentProfileId && currentProfileId !== profileId ? (
          <button
            type="button"
            disabled={contactLoading}
            onClick={async () => {
              setContactLoading(true);
              try {
                if (isContact) {
                  await supabase
                    .from("profile_contacts")
                    .delete()
                    .eq("owner_id", currentProfileId)
                    .eq("contact_profile_id", profileId);
                } else {
                  await supabase.from("profile_contacts").insert({
                    owner_id: currentProfileId,
                    contact_profile_id: profileId,
                  });
                }
                setIsContact(!isContact);
                notifyProfileContactsChanged();
              } finally {
                setContactLoading(false);
              }
            }}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isContact ? "Убрать из контактов" : "Добавить в контакты"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
