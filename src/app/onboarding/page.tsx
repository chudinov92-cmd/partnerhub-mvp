"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { authGetUser } from "@/services/authService";
import { CityDropdown } from "@/components/CityDropdown";
import { ProfessionDropdown } from "@/components/ProfessionDropdown";
import { DropdownSelect } from "@/components/DropdownSelect";
import { PioneerModal } from "@/components/PioneerModal";
import { fetchPioneerSlotsRemaining } from "@/lib/pioneerSlots";
import { CITY_VIEWS } from "@/data/cityMapViews";
import { maskProfanity } from "@/lib/profanity";
import {
  loadProfessionCatalog,
  OTHER_PROFESSION_LABEL,
  upsertProfession,
  type ProfessionCatalogRow,
} from "@/lib/professionCatalog";
import {
  getIndustryLabelsForSelect,
  getSubindustryLabelsForSelect,
  loadIndustryCatalog,
  loadSubindustryCatalog,
  type IndustryCatalogRow,
  type SubindustryCatalogRow,
} from "@/lib/industryCatalog";
import {
  parseInterestedProfessions,
  serializeInterestedProfessions,
} from "@/services/profileService";

const INDUSTRY_OPTIONS = [
  "Природные ресурсы",
  "Промышленность",
  "Строительство и инфраструктура",
  "Торговля",
  "Транспорт и логистика",
  "Финансы",
  "Информационные технологии",
  "Телекоммуникации и связь",
  "Недвижимость",
  "Государственный сектор",
  "Event-индустрия",
  "Искусство",
  "Медиапроизводство и съёмка",
  "Услуги",
  "Другое",
] as const;

const CURRENT_STATUS_OPTIONS = [
  "Учащийся",
  "Сотрудник в компании",
  "Предприниматель",
  "Фрилансер",
] as const;

const MAX_INTERESTED = 5;
const DEFAULT_COUNTRY = "Россия";
const TOTAL_STEPS = 4;

const LocationPicker = dynamic(
  () =>
    import("@/components/ProfileLocationPicker").then(
      (m) => m.ProfileLocationPicker,
    ),
  { ssr: false },
);

type OnboardingProfile = {
  id: string;
  full_name: string | null;
  age: number | null;
  city: string | null;
  industry: string | null;
  industry_other: string | null;
  subindustry: string | null;
  role_title: string | null;
  current_status: string | null;
  skills: string | null;
  resources: string | null;
  interested_in: string | null;
  onboarding_step: number;
  onboarding_completed: boolean;
};

function coordsFromCity(city: string | null | undefined) {
  const cityView = CITY_VIEWS[(city ?? "").trim()];
  if (!cityView) return null;
  const [lng, lat] = cityView.center;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function clampStep(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(0, Math.floor(value)), TOTAL_STEPS - 1);
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [lastName, setLastName] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [professionCatalog, setProfessionCatalog] = useState<
    ProfessionCatalogRow[]
  >([]);
  const [industryCatalog, setIndustryCatalog] = useState<IndustryCatalogRow[]>(
    [],
  );
  const [subindustryCatalog, setSubindustryCatalog] = useState<
    SubindustryCatalogRow[]
  >([]);
  const [professionIsOther, setProfessionIsOther] = useState(false);
  const [subindustryIsOther, setSubindustryIsOther] = useState(false);
  const [interestedDraft, setInterestedDraft] = useState<string | null>(null);
  const [pioneerRemaining, setPioneerRemaining] = useState<number | null>(null);
  const [pioneerModalOpen, setPioneerModalOpen] = useState(false);
  const coordsMovedRef = useRef(false);

  const interestedValues = useMemo(
    () => parseInterestedProfessions(profile?.interested_in),
    [profile?.interested_in],
  );

  const subindustryOptions = useMemo(() => {
    if (!profile) return [];
    if (industryCatalog.length > 0) {
      return getSubindustryLabelsForSelect(
        subindustryCatalog,
        profile.industry,
      );
    }
    return [];
  }, [profile, industryCatalog, subindustryCatalog]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const {
          data: { user },
        } = await authGetUser();
        if (!user) {
          router.replace("/auth?redirect=/onboarding");
          return;
        }

        let { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select(
            "id, full_name, age, city, industry, industry_other, subindustry, role_title, current_status, skills, resources, interested_in, onboarding_step, onboarding_completed",
          )
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (profErr) throw profErr;

        if (!prof) {
          const { data: created, error: createErr } = await supabase
            .from("profiles")
            .insert({ auth_user_id: user.id, country: DEFAULT_COUNTRY })
            .select(
              "id, full_name, age, city, industry, industry_other, subindustry, role_title, current_status, skills, resources, interested_in, onboarding_step, onboarding_completed",
            )
            .single();
          if (createErr) throw createErr;
          prof = created;
        }

        if (cancelled) return;

        const row = prof as OnboardingProfile;
        if (row.onboarding_completed) {
          router.replace("/map");
          return;
        }

        const urlStep = searchParams.get("step");
        const initialStep =
          urlStep != null ? clampStep(Number(urlStep)) : clampStep(row.onboarding_step ?? 0);

        setProfile(row);
        setStep(initialStep);

        const { data: privateRow } = await supabase
          .from("profile_private")
          .select("last_name")
          .eq("profile_id", row.id)
          .maybeSingle();
        if (!cancelled && privateRow?.last_name) {
          setLastName(privateRow.last_name);
        }

        const { data: loc } = await supabase
          .from("locations")
          .select("lat, lng")
          .eq("user_id", row.id)
          .maybeSingle();

        if (!cancelled && loc) {
          setCoords({ lat: loc.lat, lng: loc.lng });
          coordsMovedRef.current = true;
        } else if (row.city) {
          const c = coordsFromCity(row.city);
          if (c) setCoords(c);
        }

        const [profRows, indRows, subRows] = await Promise.all([
          loadProfessionCatalog().catch(() => [] as ProfessionCatalogRow[]),
          loadIndustryCatalog().catch(() => [] as IndustryCatalogRow[]),
          loadSubindustryCatalog().catch(() => [] as SubindustryCatalogRow[]),
        ]);

        if (!cancelled) {
          setProfessionCatalog(profRows);
          setIndustryCatalog(indRows);
          setSubindustryCatalog(subRows);
          const labels = profRows.map((p) => p.label);
          setProfessionIsOther(
            !!(row.role_title && !labels.includes(row.role_title)),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Не удалось загрузить данные",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  useEffect(() => {
    if (!profile?.city) {
      setPioneerRemaining(null);
      return;
    }
    void fetchPioneerSlotsRemaining(profile.city).then(setPioneerRemaining);
  }, [profile?.city]);

  const persistStep = useCallback(
    async (nextStep: number, patch: Record<string, unknown>) => {
      if (!profile) return;
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          ...patch,
          onboarding_step: nextStep,
        })
        .eq("id", profile.id);
      if (updateErr) throw updateErr;
      setProfile((prev) =>
        prev
          ? ({
              ...prev,
              ...patch,
              onboarding_step: nextStep,
            } as OnboardingProfile)
          : prev,
      );
    },
    [profile],
  );

  const validateStep = (): string | null => {
    if (!profile) return "Профиль не загружен";
    if (step === 0) {
      if (!profile.full_name?.trim()) return "Укажите имя";
      if (!profile.city?.trim()) return "Выберите город";
      if (profile.age == null || profile.age < 1 || profile.age > 80) {
        return "Укажите возраст от 1 до 80";
      }
    }
    if (step === 1) {
      if (!profile.role_title?.trim()) return "Выберите профессию";
      if (!profile.industry?.trim()) return "Выберите отрасль";
    }
    if (step === 3) {
      if (!coords) return "Укажите местоположение на карте";
    }
    return null;
  };

  const saveCurrentStepData = async () => {
    if (!profile) return;

    if (step === 0) {
      const trimmedLastName = (lastName ?? "").trim().slice(0, 25);
      await supabase.from("profile_private").upsert(
        {
          profile_id: profile.id,
          last_name: maskProfanity(trimmedLastName) || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "profile_id" },
      );
      await persistStep(step + 1, {
        full_name: maskProfanity(profile.full_name),
        age: profile.age,
        city: profile.city,
        country: DEFAULT_COUNTRY,
      });
      return;
    }

    if (step === 1) {
      if (professionIsOther && profile.role_title?.trim()) {
        try {
          await upsertProfession(profile.role_title.trim(), []);
        } catch {
          //
        }
      }
      await persistStep(step + 1, {
        role_title: maskProfanity(profile.role_title),
        industry: profile.industry,
        industry_other:
          profile.industry === "Другое"
            ? maskProfanity(profile.industry_other)
            : null,
        subindustry: maskProfanity(profile.subindustry),
        current_status: profile.current_status
          ? maskProfanity(profile.current_status)
          : null,
      });
      return;
    }

    if (step === 2) {
      await persistStep(step + 1, {
        skills: maskProfanity(profile.skills),
        resources: maskProfanity(profile.resources),
        interested_in: profile.interested_in,
      });
      return;
    }

    if (step === 3) {
      const { data: existingLoc } = await supabase
        .from("locations")
        .select("id")
        .eq("user_id", profile.id)
        .maybeSingle();

      if (existingLoc?.id) {
        const { error: locErr } = await supabase
          .from("locations")
          .update({
            lat: coords!.lat,
            lng: coords!.lng,
            city: profile.city,
            is_active: true,
          })
          .eq("id", existingLoc.id);
        if (locErr) throw locErr;
      } else {
        const { error: insertErr } = await supabase.from("locations").insert({
          user_id: profile.id,
          lat: coords!.lat,
          lng: coords!.lng,
          city: profile.city,
          is_active: true,
        });
        if (insertErr) throw insertErr;
      }

      const { error: completeErr } = await supabase
        .from("profiles")
        .update({
          onboarding_completed: true,
          onboarding_step: 4,
          map_visible: true,
        })
        .eq("id", profile.id);
      if (completeErr) throw completeErr;

      const city = profile.city?.trim();
      let isPioneer = false;
      if (city) {
        const { data: claimed, error: rpcErr } = await supabase.rpc(
          "claim_pioneer_slot",
          { p_city: city },
        );
        if (!rpcErr && claimed === true) {
          isPioneer = true;
        }
      }

      if (isPioneer) {
        setPioneerModalOpen(true);
      } else {
        router.replace("/map");
      }
    }
  };

  const handleNext = async () => {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveCurrentStepData();
      if (step < TOTAL_STEPS - 1) {
        setStep((s) => s + 1);
        router.replace(`/onboarding?step=${step + 1}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (step <= 0) return;
    const prev = step - 1;
    setStep(prev);
    setError(null);
    router.replace(`/onboarding?step=${prev}`);
  };

  const handleCityChange = (city: string) => {
    if (!profile) return;
    setProfile({ ...profile, city });
    if (!coordsMovedRef.current) {
      const next = coordsFromCity(city);
      if (next) setCoords(next);
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Загрузка…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen justify-center bg-gradient-to-br from-gray-50 via-emerald-50/30 to-emerald-50/30 px-3 py-6">
      <div className="w-full max-w-lg space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            Шаг {step + 1} из {TOTAL_STEPS}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {step === 0 && "Расскажите о себе"}
            {step === 1 && "Профессия и отрасль"}
            {step === 2 && "Интересы и о себе"}
            {step === 3 && "Ваша точка на карте"}
          </h1>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {step === 0 ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Имя *
              </label>
              <input
                type="text"
                value={profile.full_name ?? ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    full_name: e.target.value.slice(0, 25),
                  })
                }
                className="h-12 w-full rounded-xl border border-gray-300 px-3 text-base outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Фамилия
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value.slice(0, 25))}
                className="h-12 w-full rounded-xl border border-gray-300 px-3 text-base outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
              />
              <p className="mt-1 text-xs text-slate-500">
                Видна только вам
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Город *
              </label>
              <CityDropdown
                value={profile.city}
                onChange={handleCityChange}
                includeRussia={false}
                placeholder="Выберите город"
              />
              {pioneerRemaining != null && pioneerRemaining > 0 ? (
                <p className="mt-2 text-xs text-emerald-700">
                  Осталось {pioneerRemaining} бесплатных подписок на 90 дней в
                  вашем городе
                </p>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Возраст *
              </label>
              <input
                type="number"
                min={1}
                max={80}
                value={profile.age ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  const n = raw === "" ? null : Number(raw);
                  setProfile({
                    ...profile,
                    age: raw === "" ? null : Number.isFinite(n) ? n : null,
                  });
                }}
                className="h-12 w-full rounded-xl border border-gray-300 px-3 text-base outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
              />
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Профессия *
              </label>
              <ProfessionDropdown
                value={
                  professionIsOther
                    ? OTHER_PROFESSION_LABEL
                    : profile.role_title
                }
                catalog={professionCatalog}
                onChange={(v) => {
                  const isOther = v === OTHER_PROFESSION_LABEL;
                  setProfessionIsOther(isOther);
                  setProfile({
                    ...profile,
                    role_title: isOther ? "" : v,
                  });
                }}
              />
              {professionIsOther ? (
                <input
                  type="text"
                  value={profile.role_title ?? ""}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      role_title: e.target.value.slice(0, 40),
                    })
                  }
                  placeholder="Введите профессию"
                  className="mt-2 h-12 w-full rounded-xl border border-gray-300 px-3 text-base outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
                />
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Отрасль *
              </label>
              <DropdownSelect
                variant="profile"
                value={profile.industry}
                placeholder="Выберите отрасль"
                options={(industryCatalog.length > 0
                  ? getIndustryLabelsForSelect(industryCatalog)
                  : [...INDUSTRY_OPTIONS]
                ).map((ind) => ({ value: ind, label: ind }))}
                onChange={(v) =>
                  setProfile({
                    ...profile,
                    industry: v || null,
                    subindustry: null,
                  })
                }
              />
            </div>
            {subindustryOptions.length > 0 ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-800">
                  Подотрасль
                </label>
                <DropdownSelect
                  variant="profile"
                  value={
                    subindustryIsOther ? "Другое" : profile.subindustry
                  }
                  placeholder="Выберите подотрасль"
                  options={subindustryOptions.map((s) => ({
                    value: s,
                    label: s,
                  }))}
                  onChange={(v) => {
                    const isOther = v === "Другое";
                    setSubindustryIsOther(isOther);
                    setProfile({
                      ...profile,
                      subindustry: isOther ? "" : v || null,
                    });
                  }}
                />
              </div>
            ) : null}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Текущий статус
              </label>
              <DropdownSelect
                variant="profile"
                value={profile.current_status}
                placeholder="Выберите статус"
                options={CURRENT_STATUS_OPTIONS.map((s) => ({
                  value: s,
                  label: s,
                }))}
                onChange={(v) =>
                  setProfile({ ...profile, current_status: v || null })
                }
              />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                О себе
              </label>
              <textarea
                value={profile.skills ?? ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    skills: e.target.value.slice(0, 600),
                  })
                }
                rows={3}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-base outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Ресурсы
              </label>
              <textarea
                value={profile.resources ?? ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    resources: e.target.value.slice(0, 600),
                  })
                }
                rows={2}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-base outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Интересующие профессии
              </label>
              <div className="flex gap-2">
                <DropdownSelect
                  variant="profile"
                  value={interestedDraft}
                  placeholder="Выберите профессию"
                  searchable
                  options={professionCatalog.map((p) => ({
                    value: p.label,
                    label: p.label,
                  }))}
                  onChange={(v) => setInterestedDraft(v || null)}
                  disabled={interestedValues.length >= MAX_INTERESTED}
                />
                <button
                  type="button"
                  disabled={!interestedDraft}
                  onClick={() => {
                    if (!interestedDraft) return;
                    setProfile({
                      ...profile,
                      interested_in: serializeInterestedProfessions([
                        ...interestedValues,
                        interestedDraft,
                      ]),
                    });
                    setInterestedDraft(null);
                  }}
                  className="shrink-0 rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  +
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {interestedValues.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-800"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() =>
                        setProfile({
                          ...profile,
                          interested_in: serializeInterestedProfessions(
                            interestedValues.filter((x) => x !== item),
                          ),
                        })
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Кликните по карте, чтобы указать район. Точная точка скрыта для
              других пользователей.
            </p>
            <LocationPicker
              value={coords}
              onChange={(next) => {
                coordsMovedRef.current = true;
                setCoords(next);
              }}
              markerLabel={
                profile.full_name?.trim()?.[0]?.toUpperCase() ?? "Я"
              }
              className="h-72 w-full overflow-hidden rounded-xl border border-slate-200"
            />
          </div>
        ) : null}

        <div className="flex gap-3 pt-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={saving}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Назад
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void handleNext()}
            disabled={saving}
            className="flex-1 rounded-xl bg-gradient-to-r from-[#009966] to-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:from-[#009966] hover:to-emerald-700 disabled:opacity-60"
          >
            {saving
              ? "Сохраняем…"
              : step === TOTAL_STEPS - 1
                ? "На карту"
                : "Далее"}
          </button>
        </div>
      </div>

      <PioneerModal
        open={pioneerModalOpen}
        onClose={() => setPioneerModalOpen(false)}
      />
    </div>
  );
}
