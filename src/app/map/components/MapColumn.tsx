"use client";

import type { MapPageController } from "../hooks/useMapPageController";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { PartnerMapProps } from "@/components/PartnerMap";
import { DropdownSelect } from "@/components/DropdownSelect";
import { OnboardingPaywallBanner } from "@/components/OnboardingPaywallBanner";
import { SEEKING_OPTIONS, toggleArrayItem } from "@/lib/seekingOptions";
import { getProfessionLabelsForSelect } from "@/lib/professionCatalog";
import { getIndustryLabelsForSelect } from "@/lib/industryCatalog";
import { logMapSearchEvent } from "@/services/analyticsService";
import { comparePlanRank } from "@/lib/subscriptionPlans";
import { getProfessionMatchIndex } from "@/services/profileService";
import { getEffectiveSubscriptionPlan } from "@/services/subscriptionService";
import { DEFAULT_FEED_FILTERS, type FeedFilters } from "@/types";
import { RUSSIA_LABEL } from "@/data/cities";
import { SORTED_INDUSTRY_OPTIONS, CURRENT_STATUS_OPTIONS } from "../constants";
import { persistFeedFilters } from "../utils";

const PartnerMap = dynamic<PartnerMapProps>(
  () => import("@/components/PartnerMap").then((m) => m.PartnerMap),
  { ssr: false },
);

type Props = MapPageController;

export function MapColumn(props: Props) {
  const {
    mobileTab,
    hideMobileMainStack,
    feedFiltersOpen,
    setFeedFiltersOpen,
    mapViewMode,
    setMapViewMode,
    feedFilters,
    setFeedFilters,
    setRecommendedProfiles,
    recommendedLoading,
    recommendedNotice,
    setRecommendedNotice,
    setRecommendedEmptyDismissed,
    hasActiveFeedFilters,
    activeProfileOverlay,
    focusedProfileId,
    setFocusedProfileId,
    feedFiltersRef,
    recommendedEmptyBannerRef,
    mapContainerRef,
    contactsOnlyMode,
    profiles,
    currentUser,
    loading,
    openProfileOverlay,
    contactProfileIds,
    toggleContact,
    markProfileViewed,
    effectiveViewedProfileIds,
    selectedCity,
    setSelectedCity,
    professionCatalog,
    industryCatalog,
    mapConfig,
    subindustryOptionsForFilters,
    filteredProfilesForMap,
    showRecommendedEmptyBanner,
    showRecommendedEmptyRussiaPrompt,
    handleToggleRecommended,
    openChatWithProfile
  } = props;

  return (
<>
        <section
          id="main-map"
          className={`flex h-full min-h-0 flex-1 flex-col bg-white lg:min-w-0 ${
            mobileTab === "map" && !hideMobileMainStack ? "flex" : "hidden"
          } lg:flex`}
        >
          <div ref={mapContainerRef} className="relative min-h-0 flex-1">
            <div className="pointer-events-none absolute inset-0 z-[1100]">
              <div
                ref={feedFiltersRef}
                className="pointer-events-auto absolute top-[10px] right-[10px] z-[1300] flex items-center gap-2"
              >
              <button
                type="button"
                onClick={() => setFeedFiltersOpen((v) => !v)}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border p-0 text-slate-900 shadow-sm transition hover:scale-105 ${
                  hasActiveFeedFilters
                    ? "border-[#009966] bg-[#009966] hover:bg-[#009966]/90"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
                aria-label="Настройки поиска"
                title="Настройки"
              >
                <img
                  src="/Icons/Sliders.svg"
                  alt="Настройки"
                  className={`h-4 w-4 ${hasActiveFeedFilters ? "invert" : ""}`}
                />
              </button>

              <button
                type="button"
                onClick={() =>
                  setMapViewMode((v) => (v === "map" ? "list" : "map"))
                }
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border p-0 text-slate-900 shadow-sm transition hover:scale-105 ${
                  mapViewMode === "list"
                    ? "border-[#009966] bg-[#009966] hover:bg-[#009966]/90"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
                aria-label={mapViewMode === "map" ? "Список" : "Карта"}
                title={mapViewMode === "map" ? "Список" : "Карта"}
              >
                <img
                  src={mapViewMode === "map" ? "/Icons/List.svg" : "/Icons/Map.svg"}
                  alt={mapViewMode === "map" ? "Список" : "Карта"}
                  className={`h-4 w-4 ${mapViewMode === "list" ? "invert" : ""}`}
                />
              </button>

              {feedFiltersOpen && (
                <div
                  className="pointer-events-auto absolute right-0 top-[calc(100%+0.5rem)] z-[1300] flex w-[min(calc(100vw-2rem),300px)] max-h-[calc(100dvh-11.75rem-var(--zeip-paywall-banner-height,0px)-env(safe-area-inset-bottom,0px))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-xl lg:max-h-[calc(100dvh-7rem-env(safe-area-inset-top,0px))]"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="mb-2 flex shrink-0 items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">
                      Поиск специалистов
                    </p>
                    <button
                      type="button"
                      onClick={() => setFeedFiltersOpen(false)}
                      className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Закрыть"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="max-h-[min(60vh,calc(100dvh-13rem-var(--zeip-paywall-banner-height,0px)-env(safe-area-inset-bottom,0px)))] space-y-2 overflow-y-auto overscroll-y-contain pr-1 [-webkit-overflow-scrolling:touch] [touch-action:pan-y] lg:max-h-[min(70vh,calc(100dvh-8.5rem-env(safe-area-inset-top,0px)))]">
                    <button
                      type="button"
                      disabled={recommendedLoading}
                      onClick={() => void handleToggleRecommended()}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold transition ${
                        feedFilters.recommendedContacts
                          ? "border-[#009966] bg-[#009966] text-white"
                          : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <span aria-hidden>★</span>
                      Рекомендованные контакты
                    </button>

                    {recommendedNotice ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                        <p>{recommendedNotice}</p>
                        {!currentUser ? (
                          <Link
                            href="/auth"
                            className="mt-1 inline-block font-medium text-[#009966] underline"
                          >
                            Зарегистрироваться
                          </Link>
                        ) : !(currentUser.roleTitle ?? "").trim() ? (
                          <Link
                            href="/profile"
                            className="mt-1 inline-block font-medium text-[#009966] underline"
                          >
                            Заполнить профиль
                          </Link>
                        ) : null}
                      </div>
                    ) : null}

                    {recommendedLoading ? (
                      <p className="text-[11px] text-slate-500">
                        Загрузка рекомендаций...
                      </p>
                    ) : null}

                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">
                        Профессия
                      </label>
                      <DropdownSelect
                        value={feedFilters.profession}
                        placeholder="Любой"
                        searchable
                        searchPlaceholder="Найти профессию"
                        options={[
                          { value: "", label: "Любой" },
                          ...getProfessionLabelsForSelect(professionCatalog).map(
                            (label) => ({
                              value: label,
                              label,
                            }),
                          ),
                        ]}
                        onChange={(v) => {
                          const next: FeedFilters = {
                            ...feedFilters,
                            profession: v || null,
                          };
                          setFeedFilters(next);
                          persistFeedFilters(next);
                        }}
                        menuClassName="text-[11px]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">
                        Отрасль
                      </label>
                      <DropdownSelect
                        value={feedFilters.industry}
                        placeholder="Любой"
                        searchable
                        searchPlaceholder="Найти отрасль"
                        options={[
                          { value: "", label: "Любой" },
                          ...(
                            industryCatalog.length > 0
                              ? getIndustryLabelsForSelect(industryCatalog)
                              : SORTED_INDUSTRY_OPTIONS
                          ).map((ind) => ({
                            value: ind,
                            label: ind,
                          })),
                        ]}
                        onChange={(v) => {
                          const next: FeedFilters = {
                            ...feedFilters,
                            industry: v || null,
                            subindustry: null,
                          };
                          setFeedFilters(next);
                          persistFeedFilters(next);
                        }}
                        menuClassName="text-[11px]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">
                        Подотрасль
                      </label>
                      <DropdownSelect
                        value={feedFilters.subindustry}
                        disabled={!feedFilters.industry}
                        placeholder={
                          feedFilters.industry ? "Любой" : "Сначала выберите отрасль"
                        }
                        searchable
                        searchPlaceholder="Найти подотрасль"
                        options={[
                          { value: "", label: "Любой" },
                          ...subindustryOptionsForFilters.map((s) => ({
                            value: s,
                            label: s,
                          })),
                        ]}
                        onChange={(v) => {
                          const next: FeedFilters = {
                            ...feedFilters,
                            subindustry: v || null,
                          };
                          setFeedFilters(next);
                          persistFeedFilters(next);
                        }}
                        menuClassName="text-[11px]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">
                        Текущий статус
                      </label>
                      <DropdownSelect
                        value={feedFilters.current_status}
                        placeholder="Любой"
                        options={[
                          { value: "", label: "Любой" },
                          ...CURRENT_STATUS_OPTIONS.map((s) => ({
                            value: s,
                            label: s,
                          })),
                        ]}
                        onChange={(v) => {
                          const next: FeedFilters = {
                            ...feedFilters,
                            current_status: v || null,
                          };
                          setFeedFilters(next);
                          persistFeedFilters(next);
                        }}
                        menuClassName="text-[11px]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">
                        Ищут
                      </label>
                      <div className="space-y-2">
                        {SEEKING_OPTIONS.map(({ value, label }) => {
                          const checked = feedFilters.seeking.includes(value);
                          return (
                            <label
                              key={value}
                              className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-800"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  const next: FeedFilters = {
                                    ...feedFilters,
                                    seeking: toggleArrayItem(
                                      feedFilters.seeking,
                                      value,
                                    ),
                                  };
                                  setFeedFilters(next);
                                  persistFeedFilters(next);
                                }}
                                className="h-4 w-4 rounded border-slate-300 text-[#009966] focus:ring-[#009966]"
                              />
                              {label}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">
                        Онлайн / оффлайн
                      </label>
                      <DropdownSelect
                        value={feedFilters.online_status ?? ""}
                        placeholder="Любой"
                        options={[
                          { value: "", label: "Любой" },
                          { value: "online", label: "Онлайн" },
                          { value: "offline", label: "Оффлайн" },
                        ]}
                        onChange={(v) => {
                          const next: FeedFilters = {
                            ...feedFilters,
                            online_status:
                              v === "online" || v === "offline" ? v : null,
                          };
                          setFeedFilters(next);
                          persistFeedFilters(next);
                        }}
                        menuClassName="text-[11px]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">
                        Возраст
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-[10px] text-slate-500">
                            От
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={80}
                            value={feedFilters.age_from ?? ""}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const n = raw === "" ? null : Number(raw);
                              const next: FeedFilters = {
                                ...feedFilters,
                                age_from:
                                  raw === "" ? null : Number.isFinite(n) ? n : null,
                              };
                              setFeedFilters(next);
                              persistFeedFilters(next);
                            }}
                            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] text-slate-500">
                            До
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={80}
                            value={feedFilters.age_to ?? ""}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const n = raw === "" ? null : Number(raw);
                              const next: FeedFilters = {
                                ...feedFilters,
                                age_to:
                                  raw === "" ? null : Number.isFinite(n) ? n : null,
                              };
                              setFeedFilters(next);
                              persistFeedFilters(next);
                            }}
                            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                            placeholder="80"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFeedFilters(DEFAULT_FEED_FILTERS);
                          setRecommendedProfiles(null);
                          setRecommendedNotice(null);
                          persistFeedFilters(DEFAULT_FEED_FILTERS);
                        }}
                        className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Сбросить
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const profession = (feedFilters.profession ?? "").trim();
                          if (profession) {
                            void logMapSearchEvent({
                              target_profession: profession,
                              city_context: selectedCity,
                              filters_json: feedFilters,
                            });
                          }
                          setFeedFiltersOpen(false);
                        }}
                        className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-1 text-[11px] font-semibold text-white shadow-md hover:from-emerald-600 hover:to-emerald-700"
                      >
                        Поиск
                      </button>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
            {activeProfileOverlay ? (
              <div
                className="pointer-events-auto absolute inset-0 z-[1050] backdrop-blur-[2px] transition-[opacity,backdrop-filter] duration-200"
                aria-hidden
              />
            ) : null}
            {showRecommendedEmptyBanner ? (
              <div
                ref={recommendedEmptyBannerRef}
                role="alertdialog"
                aria-labelledby="recommended-empty-title"
                className="pointer-events-auto absolute inset-x-4 top-20 z-[1050] mx-auto max-w-md rounded-2xl border border-slate-200 bg-white/95 p-4 text-sm text-slate-700 shadow-lg backdrop-blur-sm"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p
                    id="recommended-empty-title"
                    className="font-medium text-slate-900"
                  >
                    Рекомендованные контакты
                  </p>
                  <button
                    type="button"
                    onClick={() => setRecommendedEmptyDismissed(true)}
                    className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Закрыть"
                  >
                    ✕
                  </button>
                </div>
                {showRecommendedEmptyRussiaPrompt ? (
                  <>
                    <p>
                      В вашем городе пока нет пользователей, интересующихся вашей
                      профессией. Хотите посмотреть по всей России?
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedCity(RUSSIA_LABEL)}
                      className="mt-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700"
                    >
                      Открыть всю Россию
                    </button>
                  </>
                ) : (
                  <p>
                    К сожалению, сейчас нет пользователей, интересующихся вашей
                    профессией. Мы сообщим вам, когда такие пользователи появятся.
                  </p>
                )}
              </div>
            ) : null}
            {mapViewMode === "map" ? (
              loading && profiles.length === 0 ? (
                <div className="flex h-full min-h-0 w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-100">
                  <p className="text-sm text-slate-500">Загрузка карты...</p>
                </div>
              ) : (
                <PartnerMap
                  profiles={filteredProfilesForMap}
                  professionFilter={feedFilters.profession}
                  contactProfileIds={contactProfileIds}
                  viewedProfileIds={effectiveViewedProfileIds}
                  focusedProfileId={focusedProfileId}
                  currentUserProfileId={currentUser?.profileId ?? null}
                  invalidateKey={`${mobileTab}-${selectedCity}-${contactsOnlyMode ? 1 : 0}-${mapViewMode}-${feedFilters.recommendedContacts ? 1 : 0}-${feedFilters.profession ?? ""}-${profiles.length}`}
                  center={mapConfig.center}
                  zoom={mapConfig.zoom}
                  onOpenProfile={(p) => {
                    const full = profiles.find((x) => x.id === p.id) ?? null;
                    if (!full) return;
                    openProfileOverlay(full);
                    setFocusedProfileId(null);
                    void markProfileViewed(
                      full.id,
                      full.content_updated_at ?? new Date().toISOString(),
                    );
                  }}
                  onOpenChat={(profileId) => {
                    if (profileId === currentUser?.profileId) return;
                    const p = profiles.find((pr) => pr.id === profileId);
                    if (p) {
                      openChatWithProfile(p);
                    }
                  }}
                  onToggleContact={(profileId) => {
                    toggleContact(profileId);
                  }}
                />
              )
            ) : (
              <div className="h-full min-h-0 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur">
                  <p className="text-sm font-semibold text-slate-900">
                    Профили
                  </p>
                  <p className="text-xs text-slate-500">
                    {feedFilters.profession
                      ? "Сортировка: сначала основная профессия, затем доп., затем тариф и рейтинг"
                      : "Сортировка: Pro+ выше Pro, затем Free и рейтинг"}
                  </p>
                </div>
                <div className="space-y-2 p-3">
                  {filteredProfilesForMap
                    .slice()
                    .sort((a, b) => {
                      if (feedFilters.profession) {
                        const aSlot = getProfessionMatchIndex(a, feedFilters.profession);
                        const bSlot = getProfessionMatchIndex(b, feedFilters.profession);
                        if (aSlot != null && bSlot != null && aSlot !== bSlot) {
                          return aSlot - bSlot;
                        }
                      }
                      const tierRank = comparePlanRank(
                        getEffectiveSubscriptionPlan(a),
                        getEffectiveSubscriptionPlan(b),
                      );
                      if (tierRank !== 0) return tierRank;
                      return (b.rating_count ?? 0) - (a.rating_count ?? 0);
                    })
                    .map((p) => {
                      const name = p.full_name || "Пользователь";
                      const initial = (name[0] || "?").toUpperCase();
                      const industry = (p.industry ?? "").trim();
                      const sub = (p.subindustry ?? "").trim();
                      const role = (p.role_title ?? "").trim();
                      const professionMatchIndex = feedFilters.profession
                        ? getProfessionMatchIndex(p, feedFilters.profession)
                        : null;
                      const matchedProfession =
                        professionMatchIndex != null && professionMatchIndex > 0
                          ? feedFilters.profession
                          : null;
                      const roleBadge =
                        professionMatchIndex != null && professionMatchIndex > 0
                          ? matchedProfession
                          : role;
                      const age =
                        typeof (p as any).age === "number" ? (p as any).age : null;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            openProfileOverlay(p);
                            setFocusedProfileId(null);
                            void markProfileViewed(
                      p.id,
                      p.content_updated_at ?? new Date().toISOString(),
                    );
                          }}
                          className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-white">
                            {initial}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {name}
                                </p>
                                <p className="truncate text-xs text-slate-500">
                                  {p.city || "Город не указан"}
                                  {age != null ? ` · ${age} лет` : ""}
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-xs font-semibold text-amber-600">
                                  ★ {p.rating_count ?? 0}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {roleBadge ? (
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[11px] ${
                                    professionMatchIndex != null && professionMatchIndex > 0
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {roleBadge}
                                </span>
                              ) : null}
                              {industry ? (
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                                  {industry}
                                </span>
                              ) : null}
                              {sub ? (
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                                  {sub}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
            {currentUser && !currentUser.isPro && mapViewMode === "map" ? (
              <OnboardingPaywallBanner />
            ) : null}
          </div>
        </section>
</>
  );
}
