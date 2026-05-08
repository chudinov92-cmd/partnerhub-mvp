"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  OTHER_PROFESSION_LABEL,
  loadProfessionCatalog,
  upsertProfession,
  type ProfessionCatalogRow,
} from "@/lib/professionCatalog";
import { DropdownSelect } from "@/components/DropdownSelect";
import { CityDropdown } from "@/components/CityDropdown";
import { ProfessionDropdown } from "@/components/ProfessionDropdown";
import { maskProfanity } from "@/lib/profanity";
import {
  getIndustryLabelsForSelect,
  getSubindustryLabelsForSelect,
  loadIndustryCatalog,
  loadSubindustryCatalog,
  upsertIndustry,
  upsertSubindustry,
  type IndustryCatalogRow,
  type SubindustryCatalogRow,
} from "@/lib/industryCatalog";

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

type Industry = (typeof INDUSTRY_OPTIONS)[number];

const SORTED_INDUSTRY_OPTIONS: Industry[] = [...INDUSTRY_OPTIONS].sort((a, b) => {
  if (a === "Другое") return 1;
  if (b === "Другое") return -1;
  return a.localeCompare(b, "ru");
});

const SUBINDUSTRY_OPTIONS: Partial<Record<Industry, string[]>> = {
  "Природные ресурсы": [
    "Сельское хозяйство",
    "Лесное хозяйство",
    "Рыболовство",
    "Охота",
    "Горнодобывающая промышленность",
    "Нефть и газ",
    "Энергетика",
    "Водные ресурсы",
  ],
  Промышленность: [
    "Производство",
    "Машиностроение",
    "Химическая промышленность",
    "Металлургия",
    "Электроника",
    "Авиационная промышленность",
    "Космическая промышленность",
    "Оборонная промышленность",
    "Биотехнологии",
    "Фармацевтика",
    "Робототехника",
  ],
  "Строительство и инфраструктура": [
    "Строительство",
    "Архитектура",
    "Девелопмент",
    "Инженерия",
    "Урбанистика",
    "Дорожное строительство",
    "ЖКХ",
  ],
  Торговля: [
    "Оптовая торговля",
    "Розничная торговля",
    "Ecommerce",
    "Маркетплейсы",
    "Dropshipping",
    "Импорт / экспорт",
  ],
  "Транспорт и логистика": [
    "Авиация",
    "Морские перевозки",
    "Железные дороги",
    "Автотранспорт",
    "Логистика",
    "Supply chain",
    "Складирование",
    "Delivery-сервисы",
  ],
  Финансы: [
    "Банки",
    "Инвестиции",
    "Страхование",
    "FinTech",
    "Криптоиндустрия",
    "Venture capital",
    "Private equity",
    "Hedge funds",
    "Трейдинг",
  ],
  "Информационные технологии": [
    "Разработка программного обеспечения",
    "Данные и Искусственный Интеллект (Data & AI)",
    "Инфраструктура и Администрирование",
    "Информационная безопасность (InfoSec)",
    "Бизнес-аналитика и Управление проектами",
    "Веб-технологии и Дизайн",
  ],
  "Телекоммуникации и связь": [
    "Мобильная связь",
    "Интернет-провайдеры",
    "Сетевое оборудование",
    "Спутниковая связь",
    "5G и новые стандарты",
    "VoIP и унифицированные коммуникации",
    "Радиосвязь",
    "Дата-центры и инфраструктура связи",
  ],
  Недвижимость: [
    "Real estate",
    "PropTech",
    "Управление недвижимостью",
    "Аренда",
    "Коммерческая недвижимость",
    "Жилая недвижимость",
  ],
  "Государственный сектор": [
    "Государственное управление",
    "Муниципальное управление",
    "Вооружённые силы",
    "Госуслуги",
    "Регулирование",
    "Налоговые службы",
  ],
  "Event-индустрия": [
    "Организация и управление мероприятиями",
    "Event-маркетинг и коммуникации",
    "Режиссура и креативное проектирование",
    "Технический продакшн",
    "Ивент-дизайн и оформление",
  ],
  Искусство: [
    "Изобразительное искусство",
    "Цифровое искусство и новые медиа",
    "Сценография и театр",
    "Реставрация и консервация",
    "Арт-менеджмент и кураторство",
    "Прикладное творчество и ремесла",
  ],
  "Медиапроизводство и съёмка": [
    "Видеосъёмка",
    "Фотосъёмка",
    "Монтаж и постпродакшн",
    "Звук и саунд-дизайн",
    "Операторское мастерство",
    "Продюсирование и организация съёмок",
  ],
  Услуги: [
    "Строительство и ремонт",
    "Туризм и путешествия",
    "Транспортные услуги",
    "Образование",
    "Медицина и здоровье",
    "Спорт и фитнес",
    "Beauty-индустрия",
  ],
};

const CURRENT_STATUS_OPTIONS = [
  "Учащийся",
  "Сотрудник в компании",
  "Предприниматель",
  "Фрилансер",
] as const;

type CurrentStatusOption = (typeof CURRENT_STATUS_OPTIONS)[number];

const SORTED_CURRENT_STATUS_OPTIONS: CurrentStatusOption[] = [
  ...CURRENT_STATUS_OPTIONS,
].sort((a, b) => a.localeCompare(b, "ru"));

const MAX_INTERESTED_PROFESSIONS = 5;

function normalizeInterestedProfessions(values: string[]) {
  const unique = new Set<string>();
  const normalized: string[] = [];
  for (const raw of values) {
    const value = (raw ?? "").trim();
    if (!value) continue;
    if (unique.has(value)) continue;
    unique.add(value);
    normalized.push(value);
    if (normalized.length >= MAX_INTERESTED_PROFESSIONS) break;
  }
  return normalized;
}

function parseInterestedProfessions(raw: string | null | undefined) {
  if (!raw) return [];
  return normalizeInterestedProfessions(raw.split(/\r?\n/));
}

function serializeInterestedProfessions(values: string[]) {
  const normalized = normalizeInterestedProfessions(values);
  return normalized.length > 0 ? normalized.join("\n") : null;
}

type Profile = {
  id: string;
  full_name: string | null;
  age: number | null;
  country: string | null;
  city: string | null;
  industry: string | null;
  industry_other: string | null;
  subindustry: string | null;
  role_title: string | null;
  experience_years: number | null;
  current_status: string | null;
  skills: string | null;
  looking_for: string | null;
  resources: string | null;
  can_help_with: string | null; // legacy in DB (not shown in UI)
  interested_in: string | null;
};

type WorkBlock = {
  id?: string;
  role_title: string | null;
  industry: string | null;
  industry_other: string | null;
  subindustry: string | null;
  experience_years: number | null;
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
  const MAX_GROUP2_BLOCKS = 5; // primary (profiles.*) + up to 4 additional blocks
  const [profile, setProfile] = useState<Profile | null>(null);
  const [location, setLocation] = useState<LocationRow | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [professionIsOther, setProfessionIsOther] = useState(false);
  const [subindustryIsOther, setSubindustryIsOther] = useState(false);
  const [workBlocks, setWorkBlocks] = useState<WorkBlock[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const savedSnapshotRef = useRef<string>("");
  const [deleteBlockConfirmOpen, setDeleteBlockConfirmOpen] = useState(false);
  const [deleteBlockConfirmIndex, setDeleteBlockConfirmIndex] = useState<
    number | null
  >(null);
  const [professionCatalog, setProfessionCatalog] = useState<ProfessionCatalogRow[]>(
    [],
  );
  const [industryCatalog, setIndustryCatalog] = useState<IndustryCatalogRow[]>([]);
  const [subindustryCatalog, setSubindustryCatalog] = useState<
    SubindustryCatalogRow[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [interestedProfessionDraft, setInterestedProfessionDraft] = useState<
    string | null
  >(null);
  const baselineSnapshotRef = useRef<string>("");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const current = JSON.stringify({ profile, workBlocks });

    // "Профиль сохранен" сбрасываем при любом изменении после успешного сохранения.
    if (isSaved && savedSnapshotRef.current && current !== savedSnapshotRef.current) {
      setIsSaved(false);
    }

    // Показ "Отмена" только если есть несохранённые изменения относительно базовой версии.
    if (baselineSnapshotRef.current) {
      setHasChanges(current !== baselineSnapshotRef.current);
    } else {
      setHasChanges(false);
    }
  }, [isSaved, profile, workBlocks]);

  const isExtraBlockStock = (wb: WorkBlock) => {
    const roleTitle = (wb.role_title ?? "").trim();
    const industry = (wb.industry ?? "").trim();
    const industryOther = (wb.industry_other ?? "").trim();
    const subindustry = (wb.subindustry ?? "").trim();

    const roleEmpty =
      !roleTitle || roleTitle === OTHER_PROFESSION_LABEL;

    const industryEmpty =
      !industry || (industry === "Другое" && !industryOther);

    // For extra blocks we store "Другое" subindustry sentinel as "".
    const subindustryEmpty = !subindustry;

    const experienceEmpty = wb.experience_years == null;

    return roleEmpty && industryEmpty && subindustryEmpty && experienceEmpty;
  };

  const requestDeleteExtraBlock = (extraIndex: number) => {
    const wb = workBlocks[extraIndex];
    if (!wb) return;

    // "Stock" (empty) blocks delete immediately without confirmation.
    if (isExtraBlockStock(wb)) {
      setWorkBlocks((prev) => prev.filter((_, i) => i !== extraIndex));
      return;
    }

    setDeleteBlockConfirmIndex(extraIndex);
    setDeleteBlockConfirmOpen(true);
  };

  const confirmDeleteExtraBlock = () => {
    if (deleteBlockConfirmIndex == null) return;
    setWorkBlocks((prev) =>
      prev.filter((_, i) => i !== deleteBlockConfirmIndex),
    );
    setDeleteBlockConfirmOpen(false);
    setDeleteBlockConfirmIndex(null);
  };

  const cancelDeleteExtraBlock = () => {
    setDeleteBlockConfirmOpen(false);
    setDeleteBlockConfirmIndex(null);
  };

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
            "id, full_name, age, country, city, industry, industry_other, subindustry, role_title, experience_years, current_status, skills, looking_for, resources, can_help_with, interested_in",
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
              "id, full_name, age, country, city, industry, industry_other, subindustry, role_title, experience_years, current_status, skills, looking_for, resources, can_help_with, interested_in",
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
        // Load profession catalog (best-effort; UI still allows free input via "Другое")
        let rows: ProfessionCatalogRow[] = [];
        try {
          rows = await loadProfessionCatalog();
        } catch {
          rows = [];
        }
        setProfessionCatalog(rows);

        const labels = rows.map((r) => r.label);
        setProfessionIsOther(!!(prof.role_title && !labels.includes(prof.role_title)));

        // Load extra work blocks (Group 2 repeats)
        try {
          const { data: wbRows, error: wbErr } = await supabase
            .from("profile_work")
            .select("id, role_title, industry, industry_other, subindustry, experience_years")
            .eq("profile_id", prof.id)
            .order("created_at", { ascending: true });
          if (wbErr) throw wbErr;
          const rows = (wbRows ?? []) as any[];
          setWorkBlocks(
            rows.map((r) => ({
              id: r.id,
              role_title: r.role_title ?? null,
              industry: r.industry ?? null,
              industry_other: r.industry_other ?? null,
              subindustry: r.subindustry ?? null,
              experience_years:
                typeof r.experience_years === "number" ? r.experience_years : null,
            })),
          );
        } catch {
          setWorkBlocks([]);
        }

        // Baseline snapshot for change detection (set after we have initial profile + workBlocks).
        // We use the loaded workBlocks from state update above on the next tick; so compute from
        // current values we already know (prof + rows) as best-effort.
        // If the async block failed, baseline will be updated by the effect once profile is set.
        try {
          const baseline = JSON.stringify({
            profile: prof,
            workBlocks: Array.isArray((profData as any)?.workBlocks)
              ? (profData as any).workBlocks
              : [],
          });
          if (!baselineSnapshotRef.current) baselineSnapshotRef.current = baseline;
        } catch {
          // ignore
        }

        // Load industry/subindustry catalogs (best-effort).
        try {
          const inds = await loadIndustryCatalog();
          setIndustryCatalog(inds);
        } catch (e) {
          console.error("Failed to load industry_catalog", e);
          setIndustryCatalog([]);
        }
        try {
          const subs = await loadSubindustryCatalog();
          setSubindustryCatalog(subs);
        } catch (e) {
          console.error("Failed to load subindustry_catalog", e);
          setSubindustryCatalog([]);
        }

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
    setIsSaved(false);

    try {
      // If user entered a custom profession ("Другое"), persist it in catalog.
      if (professionIsOther) {
        const v = (profile.role_title ?? "").trim();
        if (v) {
          try {
            await upsertProfession(v, []);
          } catch {
            // best-effort: should not block saving profile
          }
        }
      }

      // If user entered a custom industry ("Другое"), persist it in catalog.
      if ((profile.industry ?? null) === "Другое") {
        const v = (profile.industry_other ?? "").trim();
        if (v) {
          try {
            await upsertIndustry(v);
          } catch {}
        }
      }

      // If user entered a custom subindustry ("Другое"), persist it in catalog.
      if (subindustryIsOther) {
        const ind =
          (profile.industry ?? null) === "Другое"
            ? (profile.industry_other ?? "").trim()
            : (profile.industry ?? "").trim();
        const v = (profile.subindustry ?? "").trim();
        if (ind && v) {
          try {
            await upsertSubindustry(ind, v);
          } catch {}
        }
      }

      // Sync custom values from additional Group 2 blocks to catalogs as well.
      // This ensures values typed after clicking "Другое" appear in dropdowns after next refresh (and after 04:00 rule).
      for (const wb of workBlocks) {
        const roleRaw = (wb.role_title ?? "").trim();
        const role = maskProfanity(roleRaw);
        if (role && role !== OTHER_PROFESSION_LABEL) {
          const exists = professionCatalog.some((p) => p.label === role);
          if (!exists) {
            try {
              await upsertProfession(role, []);
            } catch {}
          }
        }

        if ((wb.industry ?? null) === "Другое") {
          const indOtherRaw = (wb.industry_other ?? "").trim();
          const indOther = maskProfanity(indOtherRaw);
          if (indOther) {
            try {
              await upsertIndustry(indOther);
            } catch {}
          }
        }

        const subRaw = (wb.subindustry ?? "").trim();
        const sub = maskProfanity(subRaw);
        if (sub) {
          const indLabel =
            (wb.industry ?? null) === "Другое"
              ? (wb.industry_other ?? "").trim()
              : (wb.industry ?? "").trim();
          const indLabelMasked = maskProfanity(indLabel);
          if (indLabel) {
            const exists =
              subindustryCatalog.length > 0
                ? subindustryCatalog.some(
                    (r) =>
                      r.industry_label === indLabelMasked && r.label === sub,
                  )
                : false;
            if (!exists) {
              try {
                await upsertSubindustry(indLabelMasked ?? indLabel, sub);
              } catch {}
            }
          }
        }
      }

      const interestedProfessionValues = normalizeInterestedProfessions(
        parseInterestedProfessions(profile.interested_in).map((item) =>
          maskProfanity(item),
        ),
      );
      for (const profession of interestedProfessionValues) {
        const exists = professionCatalog.some((p) => p.label === profession);
        if (!exists) {
          try {
            await upsertProfession(profession, []);
          } catch {
            // best-effort
          }
        }
      }

      // обновляем профиль
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: maskProfanity(profile.full_name),
          age: profile.age,
          country: profile.country,
          city: profile.city,
          industry: profile.industry,
          industry_other:
            profile.industry === "Другое"
              ? maskProfanity(profile.industry_other)
              : null,
          subindustry: profile.subindustry,
          role_title: maskProfanity(profile.role_title),
          experience_years: profile.experience_years,
          current_status: profile.current_status
            ? maskProfanity(profile.current_status)
            : null,
          skills: maskProfanity(profile.skills),
          looking_for: maskProfanity(profile.looking_for),
          resources: maskProfanity(profile.resources),
          interested_in: serializeInterestedProfessions(interestedProfessionValues),
        })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      // Sync repeating work blocks to DB (replace-all strategy)
      try {
        await supabase.from("profile_work").delete().eq("profile_id", profile.id);
        const payload = workBlocks
          .filter((b) => {
            const hasRole = (b.role_title ?? "").trim().length > 0;
            const hasIndustry = (b.industry ?? "").trim().length > 0;
            const hasSub = (b.subindustry ?? "").trim().length > 0;
            const hasExp = b.experience_years != null;
            return hasRole || hasIndustry || hasSub || hasExp;
          })
          .map((b) => ({
            profile_id: profile.id,
            role_title: maskProfanity(b.role_title),
            industry: b.industry,
            industry_other:
              b.industry === "Другое" ? maskProfanity(b.industry_other) : null,
            subindustry: maskProfanity(b.subindustry),
            experience_years: b.experience_years,
          }));
        if (payload.length > 0) {
          await supabase.from("profile_work").insert(payload);
        }
      } catch {
        // best-effort: do not block profile save
      }

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
      setIsSaved(true);
      savedSnapshotRef.current = JSON.stringify({ profile, workBlocks });
      baselineSnapshotRef.current = savedSnapshotRef.current;
      setHasChanges(false);
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

  const professionLabels = professionCatalog.map((p) => p.label);
  const professionRow = professionCatalog.find((p) => p.label === profile.role_title);
  void professionRow;
  const interestedProfessionValues = parseInterestedProfessions(
    profile.interested_in,
  );
  const canAddInterestedProfession =
    interestedProfessionValues.length < MAX_INTERESTED_PROFESSIONS;

  const subindustryOptions = (
    industryCatalog.length > 0
      ? getSubindustryLabelsForSelect(subindustryCatalog, profile.industry)
      : (
          (SUBINDUSTRY_OPTIONS[(profile.industry ?? null) as Industry] ?? []) as string[]
        )
          .slice()
          .sort((a, b) => a.localeCompare(b, "ru"))
          .concat("Другое")
  );

  return (
    <div className="flex min-h-screen justify-center bg-gradient-to-br from-gray-50 via-emerald-50/30 to-emerald-50/30 px-3 py-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-4xl space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg"
      >
        <div className="mb-2">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-[#009966] to-emerald-600 p-2">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-white"
                aria-hidden
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Мой профиль
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Заполните информацию о себе, чтобы другие пользователи могли вас
            найти
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-600">{success}</p>}

        {/* Группа 1: Имя / Страна / Город */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <div className="rounded-xl bg-gradient-to-br from-[#009966] to-emerald-600 p-2">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-white"
                aria-hidden
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              Личная информация
            </h2>
          </div>

          <div className="space-y-4">
            {/* Имя / возраст */}
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-800">
                  Имя
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
                  maxLength={25}
                  className="h-12 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-800">
                  Ваш возраст
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
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
                  className="h-12 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
                />
              </div>
            </div>

            {/* Страна / город */}
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-800">
                  Страна
                </label>
                <input
                  type="text"
                  value={profile.country ?? ""}
                  onChange={(e) =>
                    setProfile({ ...profile, country: e.target.value })
                  }
                  className="h-12 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-800">
                  Город
                </label>
                <CityDropdown
                  value={profile.city}
                  onChange={(city) => setProfile({ ...profile, city })}
                  includeRussia={false}
                  placeholder="Выберите город"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Группа 2: Профессия / Отрасль / Подотрасль / Стаж (повторяемая) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <div className="rounded-xl bg-gradient-to-br from-[#009966] to-emerald-600 p-2">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-white"
                aria-hidden
              >
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                <path d="M2 13h20" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              Профессиональная информация
            </h2>
          </div>

          <div className="space-y-3">
          {[
            // Первая группа 2 — источником истины остаётся profiles.*
            {
              key: "primary",
              get: () => ({
                role_title: profile.role_title,
                industry: profile.industry,
                industry_other: profile.industry_other,
                subindustry: profile.subindustry,
                experience_years: profile.experience_years,
              }),
              set: (next: WorkBlock) => {
                setProfile({
                  ...profile,
                  role_title: next.role_title,
                  industry: next.industry,
                  industry_other: next.industry_other,
                  subindustry: next.subindustry,
                  experience_years: next.experience_years,
                });
              },
              isOtherProfession: professionIsOther,
              setOtherProfession: setProfessionIsOther,
              isOtherSubindustry: subindustryIsOther,
              setOtherSubindustry: setSubindustryIsOther,
            },
            // Дополнительные блоки
            ...workBlocks.map((b, idx) => ({
              key: `extra-${b.id ?? idx}`,
              get: () => b,
              set: (next: WorkBlock) =>
                setWorkBlocks((prev) =>
                  prev.map((x, i) => (i === idx ? { ...x, ...next } : x)),
                ),
              isOtherProfession: false,
              setOtherProfession: (_: boolean) => {},
              isOtherSubindustry: false,
              setOtherSubindustry: (_: boolean) => {},
            })),
          ].map((ctx, blockIndex) => {
            const b = ctx.get();

            const professionLabelsLocal = professionLabels;
            const isPrimaryBlock = blockIndex === 0;
            const isProfessionOther = isPrimaryBlock
              ? professionIsOther ||
                (!!b.role_title &&
                  !professionLabelsLocal.includes(b.role_title) &&
                  b.role_title !== OTHER_PROFESSION_LABEL)
              : b.role_title === OTHER_PROFESSION_LABEL ||
                (!!b.role_title &&
                  !professionLabelsLocal.includes(b.role_title) &&
                  b.role_title !== OTHER_PROFESSION_LABEL);

            const industryValue =
              (b.industry ?? null) === "Другое"
                ? ((b.industry_other ?? "").trim() ? "Другое" : "Другое")
                : b.industry;

            const subOptions =
              industryCatalog.length > 0
                ? getSubindustryLabelsForSelect(subindustryCatalog, b.industry)
                : (
                    (SUBINDUSTRY_OPTIONS[(b.industry ?? null) as Industry] ?? []) as string[]
                  )
                    .slice()
                    .sort((a, c) => a.localeCompare(c, "ru"))
                    .concat("Другое");

            const isSubOther =
              ctx.isOtherSubindustry || ((b.subindustry ?? null) === "");

            return (
              <div
                key={ctx.key}
                className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4"
              >
                {!isPrimaryBlock && (
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => requestDeleteExtraBlock(blockIndex - 1)}
                      className="rounded-full p-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <img
                        src="/Icons/Trash 2.svg"
                        alt="Удалить блок"
                        className="h-4 w-4"
                      />
                    </button>
                  </div>
                )}
                {isPrimaryBlock && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Текущий статус
                    </label>
                    <DropdownSelect
                      variant="profile"
                      value={profile.current_status ?? null}
                      placeholder="Выберите статус"
                      options={SORTED_CURRENT_STATUS_OPTIONS.map((s) => ({
                        value: s,
                        label: s,
                      }))}
                      onChange={(v) => {
                        setProfile({
                          ...profile,
                          current_status: v || null,
                        });
                      }}
                      menuClassName="text-[11px]"
                    />
                  </div>
                )}
                {/* Профессия */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Профессия
                  </label>
                  <ProfessionDropdown
                    value={
                      isPrimaryBlock
                        ? professionIsOther
                          ? OTHER_PROFESSION_LABEL
                          : b.role_title
                        : b.role_title === OTHER_PROFESSION_LABEL
                          ? OTHER_PROFESSION_LABEL
                          : b.role_title
                    }
                    placeholder="Выберите профессию"
                    catalog={professionCatalog}
                    onChange={(v) => {
                      const isOther = v === OTHER_PROFESSION_LABEL;
                      if (isPrimaryBlock) {
                        ctx.setOtherProfession(isOther);
                        ctx.set({
                          ...b,
                          role_title: isOther ? "" : v,
                        });
                      } else {
                        // Для доп. блоков: "Другое" хранится как sentinel, а ввод — в role_title
                        ctx.set({
                          ...b,
                          role_title: isOther ? OTHER_PROFESSION_LABEL : v,
                        });
                      }
                    }}
                  />
                  {isProfessionOther && (
                    <div className="mt-2">
                      <label className="mb-1 block text-xs text-slate-500">
                        Укажите профессию (если выбрано «Другое»)
                      </label>
                      <input
                        type="text"
                        value={
                          b.role_title === OTHER_PROFESSION_LABEL
                            ? ""
                            : b.role_title ?? ""
                        }
                        onChange={(e) =>
                          ctx.set({ ...b, role_title: e.target.value.slice(0, 40) })
                        }
                        maxLength={40}
                        placeholder="Введите название"
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
                      />
                    </div>
                  )}
                </div>

                {/* Отрасль */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Отрасль
                  </label>
                  <DropdownSelect
                    variant="profile"
                    value={industryValue}
                    placeholder="Выберите отрасль"
                    options={(industryCatalog.length > 0
                      ? getIndustryLabelsForSelect(industryCatalog)
                      : SORTED_INDUSTRY_OPTIONS
                    ).map((ind) => ({
                      value: ind,
                      label: ind,
                    }))}
                    onChange={(v) => {
                      // reset dependent when industry changes
                      ctx.setOtherSubindustry(false);
                      ctx.set({
                        ...b,
                        industry: v || null,
                        subindustry: null,
                        industry_other: v === "Другое" ? (b.industry_other ?? "") : null,
                      });
                    }}
                  />
                </div>

                {(b.industry ?? null) === "Другое" && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Другая отрасль (введите вручную)
                    </label>
                    <input
                      type="text"
                      value={b.industry_other ?? ""}
                      onChange={(e) =>
                        ctx.set({
                          ...b,
                          industry_other: e.target.value.slice(0, 40),
                        })
                      }
                      maxLength={40}
                      placeholder="Введите название"
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
                    />
                  </div>
                )}

                {/* Подотрасль */}
                {subOptions.length > 0 && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Подотрасль
                    </label>
                    <DropdownSelect
                      variant="profile"
                      value={isSubOther ? "Другое" : b.subindustry}
                      placeholder="Выберите подотрасль"
                      options={subOptions.map((s) => ({ value: s, label: s }))}
                      onChange={(v) => {
                        const isOther = v === "Другое";
                        ctx.setOtherSubindustry(isOther);
                        ctx.set({
                          ...b,
                          subindustry: isOther ? "" : v || null,
                        });
                      }}
                    />
                    {isSubOther && (
                      <div className="mt-2">
                        <label className="mb-1 block text-xs text-slate-500">
                          Укажите подотрасль (если выбрано «Другое»)
                        </label>
                        <input
                          type="text"
                          value={b.subindustry ?? ""}
                          onChange={(e) =>
                            ctx.set({ ...b, subindustry: e.target.value.slice(0, 40) })
                          }
                          maxLength={40}
                          placeholder="Введите название"
                          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Стаж */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Стаж (в годах)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={b.experience_years ?? ""}
                    onChange={(e) =>
                      ctx.set({
                        ...b,
                        experience_years: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full max-w-[160px] rounded-xl border border-gray-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
                  />
                </div>

              </div>
            );
          })}
          <div className="pt-1 text-right">
            {workBlocks.length < MAX_GROUP2_BLOCKS - 1 ? (
              <button
                type="button"
                onClick={() =>
                  setWorkBlocks((prev) => [
                    ...prev,
                    {
                      role_title: null,
                      industry: null,
                      industry_other: null,
                      subindustry: null,
                      experience_years: null,
                    },
                  ])
                }
                className="text-sm font-semibold text-[#009966] hover:text-[#009966]/90"
              >
                Добавить
              </button>
            ) : (
              <p className="text-xs text-slate-500">Лимит: 5 блоков</p>
            )}
          </div>
          </div>
        </div>

        {/* Группа 3: Описания */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <div className="rounded-xl bg-gradient-to-br from-[#009966] to-emerald-600 p-2">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-white"
                aria-hidden
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <path d="M12 2v4" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              О себе и ресурсы
            </h2>
          </div>

          <div className="space-y-4">
            {/* О себе */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                О себе
              </label>
              <textarea
                value={profile.skills ?? ""}
                onChange={(e) =>
                  setProfile({ ...profile, skills: e.target.value.slice(0, 600) })
                }
                maxLength={600}
                rows={3}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
              />
              <div className="mt-1 text-right text-[11px] text-slate-400">
                {(profile.skills ?? "").length}/600
              </div>
            </div>

            {/* Ресурсы */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Ресурсы
              </label>
              <p className="mb-1 text-xs text-slate-500">
                Пример: Недвижимость, оборудование, транспорт, ПО
              </p>
              <textarea
                value={profile.resources ?? ""}
                onChange={(e) =>
                  setProfile({ ...profile, resources: e.target.value.slice(0, 600) })
                }
                maxLength={600}
                rows={3}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
              />
              <div className="mt-1 text-right text-[11px] text-slate-400">
                {(profile.resources ?? "").length}/600
              </div>
            </div>
          </div>
        </div>

        {/* Интересующие профессии */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <div className="rounded-xl bg-gradient-to-br from-[#009966] to-emerald-600 p-2">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-white"
                aria-hidden
              >
                <path d="M20 7h-9a3 3 0 0 0-3 3v9" />
                <path d="M14 3v4" />
                <path d="M18 3v4" />
                <path d="M3 11h7" />
                <path d="M3 15h7" />
                <path d="M16 14l1.5 1.5L21 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              Интересующие профессии
            </h2>
          </div>
          <p className="mb-4 text-xs text-slate-500">
            Добавьте до 5 профессий, специалисты которых вам интересны.
          </p>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <DropdownSelect
              variant="profile"
              value={interestedProfessionDraft}
              placeholder="Выберите профессию"
              searchable
              searchPlaceholder="Найти профессию"
              options={professionLabels.map((label) => ({
                value: label,
                label,
              }))}
              onChange={(v) => setInterestedProfessionDraft(v || null)}
              disabled={!canAddInterestedProfession}
            />
            <button
              type="button"
              disabled={!interestedProfessionDraft || !canAddInterestedProfession}
              onClick={() => {
                if (!interestedProfessionDraft) return;
                const nextInterestedIn = serializeInterestedProfessions([
                  ...interestedProfessionValues,
                  interestedProfessionDraft,
                ]);
                setProfile({ ...profile, interested_in: nextInterestedIn });
                setInterestedProfessionDraft(null);
              }}
              className="h-12 rounded-xl bg-gradient-to-r from-[#009966] to-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:from-[#009966] hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Добавить
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {interestedProfessionValues.length > 0 ? (
              interestedProfessionValues.map((profession) => (
                <span
                  key={profession}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"
                >
                  {profession}
                  <button
                    type="button"
                    onClick={() => {
                      const nextInterestedIn = serializeInterestedProfessions(
                        interestedProfessionValues.filter(
                          (item) => item !== profession,
                        ),
                      );
                      setProfile({ ...profile, interested_in: nextInterestedIn });
                    }}
                    className="text-emerald-700 hover:text-emerald-900"
                    aria-label={`Удалить профессию ${profession}`}
                  >
                    ×
                  </button>
                </span>
              ))
            ) : (
              <p className="text-xs text-slate-500">Пока ничего не выбрано.</p>
            )}
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Выбрано {interestedProfessionValues.length}/{MAX_INTERESTED_PROFESSIONS}
          </p>
        </div>

        {/* Локация на карте */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-xl bg-gradient-to-br from-[#009966] to-emerald-600 p-2">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-white"
                aria-hidden
              >
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              Локация на карте
            </h2>
          </div>

          <p className="mb-4 text-xs text-slate-500">
            Кликни по карте, чтобы указать район, где ты находишься. Точная точка
            будет скрыта для других пользователей.
          </p>

          <LocationPicker value={coords} onChange={setCoords} />
        </div>

        <div className="pt-2">
            {deleteBlockConfirmOpen && (
              <div className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/50 px-3">
                <div className="w-full max-w-sm rounded-2xl bg-white p-4 text-sm shadow-xl">
                  <p className="text-slate-900">{`Вы действительно хотите удалить данные?`}</p>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelDeleteExtraBlock}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-900 hover:bg-slate-50"
                    >
                      Нет
                    </button>
                    <button
                      type="button"
                      onClick={confirmDeleteExtraBlock}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-white hover:bg-red-700"
                    >
                      Да
                    </button>
                  </div>
                </div>
              </div>
            )}
          <div className="flex flex-col items-stretch justify-end gap-3 sm:flex-row sm:items-center">
            {hasChanges ? (
              <Link
                href="/"
                className="inline-flex h-24 w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 sm:h-24 sm:w-auto sm:px-6"
              >
                Отмена
              </Link>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className={`inline-flex h-24 w-full items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-sm transition disabled:opacity-60 sm:w-auto sm:flex-1 ${
                saving
                  ? "bg-[#009966]/80 hover:bg-[#009966]/80"
                  : isSaved
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-gradient-to-r from-[#009966] to-emerald-600 hover:from-[#009966] hover:to-emerald-700"
              }`}
            >
              {saving
                ? "Сохраняем..."
                : isSaved
                  ? "Профиль сохранен"
                  : "Сохранить профиль"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

