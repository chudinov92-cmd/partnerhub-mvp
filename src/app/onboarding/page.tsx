"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { LandingFooter } from "@/app/landing/components/LandingFooter";
import { authGetUser, authLocalSignOut } from "@/services/authService";
import {
  upsertProfilePrivate,
  completeOnboarding,
  claimPioneerSlot,
  fetchOrCreateOnboardingProfile,
  fetchProfileLastName,
  fetchLocationCoordsForProfile,
  updateProfileById,
  upsertActiveLocation,
} from "@/services/profileService";
import { reachYandexMetrikaGoal } from "@/lib/yandexMetrika";
import {
  AUTH_OPERATION_TIMEOUT_MS,
  withAuthTimeout,
} from "@/services/authService";
import { CityDropdown } from "@/components/CityDropdown";
import { ProfessionDropdown } from "@/components/ProfessionDropdown";
import { ProfessionDidYouMeanModal } from "@/components/ProfessionDidYouMeanModal";
import { ProfessionOtherInput } from "@/components/ProfessionOtherInput";
import { DropdownSelect } from "@/components/DropdownSelect";
import { MultiChoiceRow } from "@/components/MultiChoiceRow";
import { PioneerModal } from "@/components/PioneerModal";
import { QuizCompleteModal } from "@/components/QuizCompleteModal";
import { SEEKING_OPTIONS, toggleArrayItem } from "@/lib/seekingOptions";
import {
  ABOUT_ME_PLACEHOLDER,
  RESOURCES_PLACEHOLDER,
} from "@/lib/profileFieldPlaceholders";
import {
  AGE_MAX,
  AGE_MIN,
  formatAgeInputValue,
  isValidAge,
  parseAgeInput,
} from "@/lib/ageInput";
import { fetchPioneerPromoEnabled } from "@/lib/pioneerPromo";
import { fetchPioneerSlotsRemaining } from "@/lib/pioneerSlots";
import { CITY_VIEWS } from "@/data/cityMapViews";
import { maskProfanity } from "@/lib/profanity";
import {
  OTHER_PROFESSION_LABEL,
  syncCustomProfessionToCatalog,
  type ProfessionCatalogRow,
} from "@/lib/professionCatalog";
import { useProfiles } from "@/hooks/useProfiles";
import { useProfessionOtherResolver } from "@/lib/useProfessionOtherResolver";
import {
  getIndustryLabelsForSelect,
  getSubindustryLabelsForSelect,
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

const STEP_TITLES = [
  "Расскажите о себе",
  "Профессия и отрасль",
  "Интересы и о себе",
  "Ваша точка на карте",
] as const;

const FIELD_CLASS =
  "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#009966] focus:ring-2 focus:ring-[#009966]/20";

const TEXTAREA_CLASS =
  "w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#009966] focus:ring-2 focus:ring-[#009966]/20";

function StepProgress({ step }: { step: number }) {
  return (
    <div className="space-y-2.5">
      <div className="flex gap-1.5" aria-hidden>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={
              "h-1 flex-1 rounded-full transition-colors " +
              (i <= step ? "bg-[#009966]" : "bg-slate-200")
            }
          />
        ))}
      </div>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#009966]">
        Шаг {step + 1} из {TOTAL_STEPS}
      </p>
    </div>
  );
}

function FieldLabel({
  children,
  required,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-slate-800">
      {children}
      {required ? <span className="ml-0.5 text-[#009966]">*</span> : null}
    </label>
  );
}

function ChoiceChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={
        "flex min-h-12 items-center justify-center rounded-2xl border px-2 py-2 text-center text-[13px] font-medium leading-tight transition " +
        (selected
          ? "border-[#009966] bg-[#009966] text-white"
          : "border-slate-200 bg-white text-slate-700 active:bg-slate-50")
      }
    >
      {children}
    </button>
  );
}

function OnboardingShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#f6f8f7] bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(0,153,102,0.14),transparent)]">
      <div className="flex flex-1 flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        {children}
      </div>
      <LandingFooter />
    </div>
  );
}

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
  seeking: string[];
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

function syncStepInUrl(nextStep: number) {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", `/onboarding?step=${nextStep}`);
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepQuery = searchParams.get("step");
  const initialStepQueryRef = useRef(stepQuery);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [lastName, setLastName] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const {
    professionCatalog,
    industryCatalog,
    subindustryCatalog,
    setProfessionCatalog,
  } = useProfiles();
  const [professionIsOther, setProfessionIsOther] = useState(false);
  const [subindustryIsOther, setSubindustryIsOther] = useState(false);
  const [interestedDraft, setInterestedDraft] = useState<string | null>(null);
  const [pioneerRemaining, setPioneerRemaining] = useState<number | null>(null);
  const [pioneerPromoEnabled, setPioneerPromoEnabled] = useState(false);
  const [pioneerModalOpen, setPioneerModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const coordsMovedRef = useRef(false);
  const professionOtherInputRef = useRef<HTMLInputElement>(null);
  const professionResolver = useProfessionOtherResolver(professionCatalog);

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
          error: userErr,
        } = await withAuthTimeout(
          authGetUser(),
          "getUser",
          AUTH_OPERATION_TIMEOUT_MS,
        );
        if (userErr || !user) {
          await authLocalSignOut().catch(() => undefined);
          if (!cancelled) {
            setError("Нет активной сессии. Зарегистрируйтесь заново.");
          }
          return;
        }

        const { data: prof, error: profErr } = await fetchOrCreateOnboardingProfile(
          user.id,
        );

        if (profErr) {
          if (!prof) {
            await authLocalSignOut().catch(() => undefined);
            throw new Error(
              "Не удалось создать профиль. Сессия после удаления аккаунта недействительна — зарегистрируйтесь заново.",
            );
          }
          throw profErr;
        }

        if (!prof) {
          await authLocalSignOut().catch(() => undefined);
          throw new Error(
            "Не удалось создать профиль. Сессия после удаления аккаунта недействительна — зарегистрируйтесь заново.",
          );
        }

        if (cancelled) return;

        const row = prof as OnboardingProfile;
        if (row.onboarding_completed) {
          router.replace("/map");
          return;
        }

        const urlStep = initialStepQueryRef.current;
        const initialStep =
          urlStep != null ? clampStep(Number(urlStep)) : clampStep(row.onboarding_step ?? 0);

        setProfile({
          ...row,
          seeking: row.seeking ?? [],
        });
        setStep(initialStep);

        const loadedLastName = await fetchProfileLastName(row.id);
        if (!cancelled && loadedLastName) {
          setLastName(loadedLastName);
        }

        const loc = await fetchLocationCoordsForProfile(row.id);

        if (!cancelled && loc) {
          setCoords({ lat: loc.lat, lng: loc.lng });
          coordsMovedRef.current = true;
        } else if (row.city) {
          const c = coordsFromCity(row.city);
          if (c) setCoords(c);
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
  }, [router]);

  useEffect(() => {
    if (!profile?.role_title) return;
    const labels = professionCatalog.map((p) => p.label);
    setProfessionIsOther(!labels.includes(profile.role_title));
  }, [profile?.role_title, professionCatalog]);

  useEffect(() => {
    let cancelled = false;
    void fetchPioneerPromoEnabled().then((enabled) => {
      if (!cancelled) setPioneerPromoEnabled(enabled);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (step >= 2) {
      void import("@/components/ProfileLocationPicker");
    }
  }, [step]);

  useEffect(() => {
    if (!pioneerPromoEnabled || !profile?.city) {
      setPioneerRemaining(null);
      return;
    }
    void fetchPioneerSlotsRemaining(profile.city).then(setPioneerRemaining);
  }, [pioneerPromoEnabled, profile?.city]);

  const persistStep = useCallback(
    async (nextStep: number, patch: Record<string, unknown>) => {
      if (!profile) return;
      const { error: updateErr } = await updateProfileById(profile.id, {
        ...patch,
        onboarding_step: nextStep,
      });
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
      if (!isValidAge(profile.age)) {
        return "Укажите возраст от 1 до 99";
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

  const saveCurrentStepData = async (
    currentStep: number,
    options?: { resolvedRoleTitle?: string | null },
  ) => {
    if (!profile) return;

    if (currentStep === 0) {
      const trimmedLastName = (lastName ?? "").trim().slice(0, 25);
      await upsertProfilePrivate({
        profile_id: profile.id,
        last_name: maskProfanity(trimmedLastName) || null,
        updated_at: new Date().toISOString(),
      });
      await persistStep(currentStep + 1, {
        full_name: maskProfanity(profile.full_name),
        age: profile.age,
        city: profile.city,
        country: DEFAULT_COUNTRY,
      });
      reachYandexMetrikaGoal("onboarding_step_1");
      return;
    }

    if (currentStep === 1) {
      const roleTitle = options?.resolvedRoleTitle ?? profile.role_title;
      await persistStep(currentStep + 1, {
        role_title: maskProfanity(roleTitle),
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
      reachYandexMetrikaGoal("onboarding_step_2");
      return;
    }

    if (currentStep === 2) {
      await persistStep(currentStep + 1, {
        skills: maskProfanity(profile.skills),
        resources: maskProfanity(profile.resources),
        interested_in: profile.interested_in,
        seeking: profile.seeking ?? [],
      });
      reachYandexMetrikaGoal("onboarding_step_3");
      return;
    }

    if (currentStep === 3) {
      const { error: locErr } = await upsertActiveLocation({
        profileId: profile.id,
        lat: coords!.lat,
        lng: coords!.lng,
        city: profile.city,
        isActive: true,
      });
      if (locErr) throw locErr;

      const { error: completeErr } = await completeOnboarding(profile.id);
      if (completeErr) throw completeErr;
      reachYandexMetrikaGoal("onboarding_step_4");
      reachYandexMetrikaGoal("onboarding_complete", {
        city: profile.city ?? undefined,
      });

      const city = profile.city?.trim();
      let isPioneer = false;
      const promoOn = await fetchPioneerPromoEnabled();
      if (promoOn && city) {
        const { data: claimed, error: rpcErr } = await claimPioneerSlot({
          p_city: city,
        });
        if (!rpcErr && claimed === true) {
          isPioneer = true;
        }
      }

      if (isPioneer) {
        setPioneerModalOpen(true);
      } else {
        setCompleteModalOpen(true);
      }
    }
  };

  const handleNext = async () => {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    const from = step;
    setSaving(true);
    setError(null);

    let resolvedRoleTitle: string | null = null;

    try {
      if (from === 1 && profile) {
        let roleTitle = profile.role_title ?? "";
        if (professionIsOther && roleTitle.trim()) {
          const resolved = await professionResolver.resolveForSave(roleTitle);
          if (resolved.action === "canonical") {
            setProfessionIsOther(false);
            roleTitle = resolved.label;
            setProfile((prev) =>
              prev ? { ...prev, role_title: resolved.label } : prev,
            );
          } else {
            roleTitle = resolved.label;
            const nextCatalog = await syncCustomProfessionToCatalog(
              professionCatalog,
              resolved.label,
            );
            setProfessionCatalog(nextCatalog);
            setProfile((prev) =>
              prev ? { ...prev, role_title: resolved.label } : prev,
            );
          }
        }
        resolvedRoleTitle = roleTitle;
      }

      if (from < TOTAL_STEPS - 1) {
        setStep(from + 1);
        syncStepInUrl(from + 1);
      }

      await saveCurrentStepData(from, { resolvedRoleTitle });
    } catch (err) {
      if (from < TOTAL_STEPS - 1) {
        setStep(from);
        syncStepInUrl(from);
      }
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
    syncStepInUrl(prev);
  };

  const handleCityChange = (city: string) => {
    if (!profile) return;
    setProfile({ ...profile, city });
    if (!coordsMovedRef.current) {
      const next = coordsFromCity(city);
      if (next) setCoords(next);
    }
  };

  if (loading && !profile) {
    return (
      <OnboardingShell>
        <p className="flex min-h-[70dvh] items-center justify-center text-sm text-slate-500">
          Загрузка…
        </p>
      </OnboardingShell>
    );
  }

  if (!profile) {
    return (
      <OnboardingShell>
        <div className="mx-auto flex min-h-[70dvh] w-full max-w-lg flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm text-slate-600">
            {error ??
              "Сессия недействительна. Войдите или зарегистрируйтесь заново."}
          </p>
          <a
            href="/auth?mode=signup"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#009966] px-5 text-sm font-semibold text-white"
          >
            К регистрации
          </a>
        </div>
      </OnboardingShell>
    );
  }

  return (
    <>
    <OnboardingShell>
      <div className="mx-auto flex w-full max-w-lg flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_12px_40px_rgba(15,23,42,0.06)] sm:p-6">
        <StepProgress step={step} />
        <h1 className="mt-3 text-[1.65rem] font-bold leading-tight tracking-tight text-slate-900">
          {STEP_TITLES[step]}
        </h1>

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-5 space-y-5">
          {step === 0 ? (
            <>
              <div>
                <FieldLabel required>Имя</FieldLabel>
                <input
                  type="text"
                  autoComplete="given-name"
                  enterKeyHint="next"
                  value={profile.full_name ?? ""}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      full_name: e.target.value.slice(0, 25),
                    })
                  }
                  className={FIELD_CLASS}
                />
              </div>
              <div>
                <FieldLabel>Фамилия</FieldLabel>
                <input
                  type="text"
                  autoComplete="family-name"
                  enterKeyHint="next"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value.slice(0, 25))}
                  className={FIELD_CLASS}
                />
                <p className="mt-1.5 text-xs text-slate-500">Видна только вам</p>
              </div>
              <div>
                <FieldLabel required>Город</FieldLabel>
                <CityDropdown
                  value={profile.city}
                  onChange={handleCityChange}
                  includeRussia={false}
                  placeholder="Выберите город"
                />
                {pioneerRemaining != null && pioneerRemaining > 0 ? (
                  <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs leading-snug text-[#009966]">
                    Осталось {pioneerRemaining} бесплатных подписок Pro+ на 90 дней в
                    вашем городе
                  </p>
                ) : null}
              </div>
              <div>
                <FieldLabel required>Возраст</FieldLabel>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[1-9][0-9]?"
                  min={AGE_MIN}
                  max={AGE_MAX}
                  maxLength={2}
                  value={formatAgeInputValue(profile.age)}
                  onChange={(e) => {
                    setProfile({
                      ...profile,
                      age: parseAgeInput(e.target.value),
                    });
                  }}
                  className={FIELD_CLASS}
                />
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <div>
                <FieldLabel>Текущий статус</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  {CURRENT_STATUS_OPTIONS.map((status) => (
                    <ChoiceChip
                      key={status}
                      selected={profile.current_status === status}
                      onClick={() =>
                        setProfile({
                          ...profile,
                          current_status:
                            profile.current_status === status ? null : status,
                        })
                      }
                    >
                      {status}
                    </ChoiceChip>
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel required>Профессия</FieldLabel>
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
                    if (isOther) {
                      requestAnimationFrame(() => {
                        professionOtherInputRef.current?.focus();
                      });
                    }
                  }}
                />
                {professionIsOther ? (
                  <div className="mt-2">
                    <ProfessionOtherInput
                      inputRef={professionOtherInputRef}
                      autoFocus
                      value={profile.role_title ?? ""}
                      catalog={professionCatalog}
                      dismissedKeys={professionResolver.dismissedKeys}
                      onDismissSuggestion={professionResolver.dismissSuggestion}
                      onChange={(v) =>
                        setProfile({
                          ...profile,
                          role_title: v,
                        })
                      }
                      onResolved={(canonicalLabel) => {
                        setProfessionIsOther(false);
                        setProfile({
                          ...profile,
                          role_title: canonicalLabel,
                        });
                      }}
                      placeholder="Введите профессию"
                      className={FIELD_CLASS}
                    />
                  </div>
                ) : null}
              </div>
              <div>
                <FieldLabel required>Отрасль</FieldLabel>
                <DropdownSelect
                  variant="profile"
                  value={profile.industry}
                  title="Отрасль"
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
                  <FieldLabel>Подотрасль</FieldLabel>
                  <DropdownSelect
                    variant="profile"
                    value={
                      subindustryIsOther ? "Другое" : profile.subindustry
                    }
                    title="Подотрасль"
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
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-800">Ищу</p>
                <p className="text-xs text-slate-500">Можно выбрать несколько</p>
                <div className="space-y-2">
                  {SEEKING_OPTIONS.map(({ value, label }) => (
                    <MultiChoiceRow
                      key={value}
                      selected={(profile.seeking ?? []).includes(value)}
                      onClick={() =>
                        setProfile({
                          ...profile,
                          seeking: toggleArrayItem(
                            profile.seeking ?? [],
                            value,
                          ),
                        })
                      }
                    >
                      {label}
                    </MultiChoiceRow>
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel>О себе</FieldLabel>
                <textarea
                  value={profile.skills ?? ""}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      skills: e.target.value.slice(0, 600),
                    })
                  }
                  placeholder={ABOUT_ME_PLACEHOLDER}
                  maxLength={600}
                  rows={3}
                  className={TEXTAREA_CLASS}
                />
              </div>
              <div>
                <FieldLabel>Ресурсы</FieldLabel>
                <textarea
                  value={profile.resources ?? ""}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      resources: e.target.value.slice(0, 600),
                    })
                  }
                  placeholder={RESOURCES_PLACEHOLDER}
                  maxLength={600}
                  rows={2}
                  className={TEXTAREA_CLASS}
                />
              </div>
              <div>
                <FieldLabel>Интересующие профессии</FieldLabel>
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1">
                    <DropdownSelect
                      variant="profile"
                      value={interestedDraft}
                      title="Интересующие профессии"
                      placeholder="Выберите профессию"
                      searchable
                      options={professionCatalog.map((p) => ({
                        value: p.label,
                        label: p.label,
                      }))}
                      onChange={(v) => setInterestedDraft(v || null)}
                      disabled={interestedValues.length >= MAX_INTERESTED}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!interestedDraft}
                    aria-label="Добавить профессию"
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
                    className="h-12 w-12 shrink-0 rounded-2xl bg-[#009966] text-lg font-semibold text-white disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
                {interestedValues.length > 0 ? (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {interestedValues.map((item) => (
                      <span
                        key={item}
                        className="inline-flex max-w-full items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800"
                      >
                        <span className="truncate">{item}</span>
                        <button
                          type="button"
                          aria-label={`Убрать ${item}`}
                          className="grid h-4 w-4 place-items-center rounded-full text-emerald-700"
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
                ) : null}
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <p className="text-sm leading-relaxed text-slate-600">
                Кликните по карте, чтобы указать район.
                <br />
                Ваши точные координаты скрыты от других пользователей. Точка
                показывается произвольно в радиусе 300 метров от указанной вами.
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
                className="h-[260px] w-full overflow-hidden rounded-2xl border border-slate-200"
              />
            </>
          ) : null}
        </div>

        <div className="mt-6 flex gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={saving}
              className="h-12 flex-1 rounded-2xl border border-slate-200 px-4 text-sm font-medium text-slate-700 active:bg-slate-50 disabled:opacity-50"
            >
              Назад
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void handleNext()}
            disabled={saving}
            className="h-12 flex-1 rounded-2xl bg-[#009966] px-4 text-sm font-semibold text-white shadow-sm active:bg-[#007a52] disabled:opacity-60"
          >
            {saving
              ? "Сохраняем…"
              : step === TOTAL_STEPS - 1
                ? "На карту"
                : "Далее"}
          </button>
        </div>
      </div>
    </OnboardingShell>
      <PioneerModal
        open={pioneerModalOpen}
        onClose={() => setPioneerModalOpen(false)}
      />
      <ProfessionDidYouMeanModal
        open={professionResolver.modalOpen}
        input={professionResolver.modalInput}
        suggestion={professionResolver.modalSuggestion}
        onConfirm={professionResolver.confirmCanonical}
        onReject={professionResolver.confirmCustom}
      />
      <QuizCompleteModal
        open={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
      />
    </>
  );
}
