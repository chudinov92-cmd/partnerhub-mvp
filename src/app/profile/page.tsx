"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  full_name: string | null;
  country: string | null;
  city: string | null;
  role_title: string | null;
  domain: string | null;
  experience_years: number | null;
  skills: string | null;
  looking_for: string | null;
  can_help_with: string | null;
  interested_in: string | null;
};

type LocationRow = {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  city: string | null;
};

const LocationPicker = dynamic(
  () =>
    import("@/components/ProfileLocationPicker").then(
      (m) => m.ProfileLocationPicker,
    ),
  { ssr: false },
);

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [location, setLocation] = useState<LocationRow | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setError("Нужно войти в аккаунт");
          return;
        }

        // получаем профиль по auth_user_id
        let { data: profData, error: pErr } = await supabase
          .from("profiles")
          .select(
            "id, full_name, country, city, role_title, domain, experience_years, skills, looking_for, can_help_with, interested_in",
          )
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (pErr) {
          setError(pErr.message);
          return;
        }

        // если профиль отсутствует, создаём пустой
        if (!profData) {
          const { data: created, error: cErr } = await supabase
            .from("profiles")
            .insert({
              auth_user_id: user.id,
            })
            .select(
              "id, full_name, country, city, role_title, domain, experience_years, skills, looking_for, can_help_with, interested_in",
            )
            .single();

          if (cErr) {
            setError(cErr.message);
            return;
          }

          profData = created;
        }

        const prof = profData as Profile;
        setProfile(prof);

        if (prof) {
          const { data: locData, error: lErr } = await supabase
            .from("locations")
            .select("id, user_id, lat, lng, city")
            .eq("user_id", prof.id)
            .maybeSingle();

          if (!lErr && locData) {
            const loc = locData as LocationRow;
            setLocation(loc);
            setCoords({ lat: loc.lat, lng: loc.lng });
          }
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // обновляем профиль
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          country: profile.country,
          city: profile.city,
          role_title: profile.role_title,
          domain: profile.domain,
          experience_years: profile.experience_years,
          skills: profile.skills,
          looking_for: profile.looking_for,
          can_help_with: profile.can_help_with,
          interested_in: profile.interested_in,
        })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      // обновляем / создаём локацию
      if (coords) {
        if (location) {
          const { error: locErr } = await supabase
            .from("locations")
            .update({
              lat: coords.lat,
              lng: coords.lng,
              city: profile.city,
              is_active: true,
            })
            .eq("id", location.id);

          if (locErr) throw locErr;
        } else {
          const { error: insertErr } = await supabase.from("locations").insert({
            user_id: profile.id, // profiles.id
            lat: coords.lat,
            lng: coords.lng,
            city: profile.city,
            is_active: true,
          });

          if (insertErr) throw insertErr;
        }
      }

      setSuccess("Профиль сохранён");
      // обновим данные на других страницах и вернёмся на главную
      router.refresh();
      router.push("/");
    } catch (err: any) {
      setError(err.message ?? "Не удалось сохранить профиль");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Загрузка профиля...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">
          Профиль не найден. Попробуй выйти и войти снова.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen justify-center bg-slate-50 px-3 py-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl space-y-4 rounded-2xl bg-white p-5 shadow-sm"
      >
        <h1 className="text-lg font-semibold text-slate-900">Мой профиль</h1>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-600">{success}</p>}

        {/* Имя */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Имя
          </label>
          <input
            type="text"
            value={profile.full_name ?? ""}
            onChange={(e) =>
              setProfile({ ...profile, full_name: e.target.value })
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
        </div>

        {/* Страна / город */}
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Страна
            </label>
            <input
              type="text"
              value={profile.country ?? ""}
              onChange={(e) =>
                setProfile({ ...profile, country: e.target.value })
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Город
            </label>
            <input
              type="text"
              value={profile.city ?? ""}
              onChange={(e) =>
                setProfile({ ...profile, city: e.target.value })
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Кем работаешь / сфера */}
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Кем работаешь
            </label>
            <input
              type="text"
              value={profile.role_title ?? ""}
              onChange={(e) =>
                setProfile({ ...profile, role_title: e.target.value })
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              В какой сфере работаешь
            </label>
            <input
              type="text"
              value={profile.domain ?? ""}
              onChange={(e) =>
                setProfile({ ...profile, domain: e.target.value })
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Стаж */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Стаж (в годах)
          </label>
          <input
            type="number"
            min={0}
            value={profile.experience_years ?? ""}
            onChange={(e) =>
              setProfile({
                ...profile,
                experience_years: e.target.value
                  ? Number(e.target.value)
                  : null,
              })
            }
            className="w-full max-w-[160px] rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
        </div>

        {/* Что умеешь */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Что умеешь
          </label>
          <textarea
            value={profile.skills ?? ""}
            onChange={(e) =>
              setProfile({ ...profile, skills: e.target.value })
            }
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
        </div>

        {/* Что хочешь найти */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Что хочешь найти на платформе
          </label>
          <textarea
            value={profile.looking_for ?? ""}
            onChange={(e) =>
              setProfile({ ...profile, looking_for: e.target.value })
            }
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
        </div>

        {/* Чем можешь помочь */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Чем можешь помочь другим
          </label>
          <textarea
            value={profile.can_help_with ?? ""}
            onChange={(e) =>
              setProfile({ ...profile, can_help_with: e.target.value })
            }
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
        </div>

        {/* Кто интересует */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Какие специалисты и из каких сфер интересуют
          </label>
          <textarea
            value={profile.interested_in ?? ""}
            onChange={(e) =>
              setProfile({ ...profile, interested_in: e.target.value })
            }
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
        </div>

        {/* Локация на карте */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">
            Локация на карте
          </p>
          <p className="text-xs text-slate-500">
            Кликни по карте, чтобы указать район, где ты находишься. Точная
            точка будет скрыта для других пользователей.
          </p>
          <LocationPicker value={coords} onChange={setCoords} />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-60"
          >
            {saving ? "Сохраняем..." : "Сохранить профиль"}
          </button>
        </div>
      </form>
    </div>
  );
}

