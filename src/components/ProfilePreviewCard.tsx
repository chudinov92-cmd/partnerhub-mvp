"use client";

import Link from "next/link";

export type ProfilePreviewData = {
  id: string;
  full_name: string | null;
  city: string | null;
  industry?: string | null;
  subindustry?: string | null;
  role_title?: string | null;
  skills?: string | null;
  resources?: string | null;
  rating_count?: number | null;
};

function splitToBulletItems(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];
  const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (lines.length > 0) return lines;
  return [text.trim()];
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}

function IconMapPin({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconBriefcase({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconUser({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconLightbulb({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" strokeLinecap="round" />
      <path d="M9 18h6M10 22h4" strokeLinecap="round" />
    </svg>
  );
}

function IconMessageSquare({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconExternalLink({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconUserPlus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  );
}

function IconUserMinus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  );
}

const AVATAR_FALLBACK_BG = "#374151";

type ProfilePreviewCardProps = {
  profile: ProfilePreviewData;
  online: boolean;
  onWrite: () => void;
  profileHref: string;
  onClose?: () => void;
  showContactButton?: boolean;
  isInContacts?: boolean;
  onToggleContact?: () => void;
  className?: string;
  style?: React.CSSProperties;
  /** floating = фиксированная карточка на главной; embedded = внутри Leaflet Popup */
  variant?: "floating" | "embedded";
  /** для закрытия по клику вне — маркер корня (главная страница) */
  rootDataAttr?: boolean;
};

export function ProfilePreviewCard({
  profile,
  online,
  onWrite,
  profileHref,
  onClose,
  showContactButton,
  isInContacts,
  onToggleContact,
  className = "",
  style,
  variant = "floating",
  rootDataAttr,
}: ProfilePreviewCardProps) {
  const name = profile.full_name || "Пользователь";
  const initial = (name[0] || "?").toLocaleUpperCase("ru-RU");
  const aboutItems = splitToBulletItems(profile.skills);
  const resourceItems = splitToBulletItems(profile.resources);
  const hasIndustryBlock = !!(profile.industry?.trim() || profile.subindustry?.trim());
  const rating = profile.rating_count ?? 0;
  const showRating = rating > 0;

  const isEmbedded = variant === "embedded";
  const headText = isEmbedded ? "text-lg" : "text-2xl";
  const avatarSize = isEmbedded ? "h-14 w-14 border-[3px]" : "h-20 w-20 border-4";
  const initialText = isEmbedded ? "text-lg" : "text-2xl";
  const headerPad = isEmbedded ? "px-4 pt-4 pb-5" : "px-6 pt-6 pb-8";
  const bodyPad = isEmbedded ? "px-4 py-3 space-y-3" : "px-6 py-5 space-y-5";
  const footerPad = isEmbedded ? "px-4 py-3" : "px-6 py-4";
  const sectionTitle = isEmbedded ? "text-xs font-semibold" : "font-semibold";
  const bodyText = isEmbedded ? "text-[11px] text-gray-600" : "text-sm text-gray-600";

  const rootClass =
    variant === "floating"
      ? `fixed z-[1300] w-[min(100vw-1rem,32rem)] max-h-[min(90vh,640px)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl ${className}`
      : `max-h-[min(70vh,32rem)] box-border w-full min-w-0 overflow-hidden rounded-xl bg-white ${className}`;

  return (
    <div
      {...(rootDataAttr ? { "data-profile-card": true } : {})}
      className={rootClass}
      style={style}
    >
      <div className="flex max-h-[inherit] w-full min-w-0 flex-col overflow-hidden">
        <div
          className={`relative w-full min-w-0 shrink-0 bg-gradient-to-br from-slate-700 to-slate-900 text-white ${headerPad}`}
        >
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-10 rounded-full p-1 transition-colors hover:bg-white/20"
              aria-label="Закрыть"
            >
              <IconX className="h-5 w-5" />
            </button>
          ) : null}

          <div className="flex items-start gap-3 sm:gap-4">
            <div
              className={`flex shrink-0 items-center justify-center rounded-full border-white font-bold text-white shadow-lg ${avatarSize}`}
              style={{ backgroundColor: AVATAR_FALLBACK_BG }}
            >
              <span className={initialText}>{initial}</span>
            </div>

            <div className="min-w-0 flex-1 pr-6">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h2 className={`font-bold leading-tight ${headText}`}>{name}</h2>
                <div
                  className={`h-3 w-3 shrink-0 rounded-full border-2 border-white ${
                    online ? "bg-emerald-400" : "bg-gray-400"
                  }`}
                  title={online ? "Онлайн" : "Оффлайн"}
                />
              </div>

              {profile.role_title ? (
                <span className="mb-2 inline-block rounded-md bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                  {profile.role_title}
                </span>
              ) : null}

              <div className="mt-1 flex items-center gap-1.5 text-sm text-white/90">
                <IconMapPin className="h-4 w-4 shrink-0" />
                <span>{profile.city?.trim() || "Город не указан"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={`min-h-0 w-full min-w-0 flex-1 overflow-y-auto ${bodyPad}`}>
          {hasIndustryBlock ? (
            <div className="space-y-2">
              <div className={`flex items-center gap-2 text-slate-900 ${sectionTitle}`}>
                <IconBriefcase className="h-4 w-4 shrink-0" />
                <h3>Отрасль</h3>
              </div>
              <p className={`pl-6 ${bodyText}`}>
                {profile.industry?.trim() || "Не указана"}
              </p>
              {profile.subindustry?.trim() ? (
                <div className="pl-6">
                  <p className={`text-gray-500 ${isEmbedded ? "text-[10px]" : "text-sm"}`}>
                    Подотрасль:
                  </p>
                  <p className={bodyText}>{profile.subindustry}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <div className={`flex items-center gap-2 text-slate-900 ${sectionTitle}`}>
              <IconUser className="h-4 w-4 shrink-0" />
              <h3>О себе</h3>
            </div>
            <ul className="space-y-1.5 pl-6">
              {(aboutItems.length ? aboutItems : ["Не указано"]).map((item, index) => (
                <li
                  key={index}
                  className={`flex items-start gap-2 ${bodyText}`}
                >
                  <span className="mt-0.5 text-gray-400">•</span>
                  <span className="whitespace-pre-wrap">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {resourceItems.length > 0 ? (
            <div className="space-y-2">
              <div className={`flex items-center gap-2 text-slate-900 ${sectionTitle}`}>
                <IconLightbulb className="h-4 w-4 shrink-0" />
                <h3>Ресурсы</h3>
              </div>
              <ul className="space-y-1.5 pl-6">
                {resourceItems.map((item, index) => (
                  <li
                    key={index}
                    className={`flex items-start gap-2 ${bodyText}`}
                  >
                    <span className="mt-0.5 text-gray-400">•</span>
                    <span className="whitespace-pre-wrap">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {showRating ? (
            <div className="rounded-lg border border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50 p-3">
              <div className="flex items-center justify-between">
                <span className={`font-medium text-slate-900 ${isEmbedded ? "text-[11px]" : "text-sm"}`}>
                  Рейтинг
                </span>
                <div className="flex items-center gap-1">
                  <span className={`font-bold text-yellow-600 ${isEmbedded ? "text-sm" : "text-lg"}`}>
                    ★
                  </span>
                  <span className={`font-semibold text-slate-900 ${isEmbedded ? "text-xs" : ""}`}>
                    {rating}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className={`w-full min-w-0 shrink-0 space-y-3 border-t border-gray-200 bg-gray-50 ${footerPad}`}>
          <div className="flex gap-2 sm:gap-3">
            <Link
              href={profileHref}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white font-medium text-slate-900 transition-colors hover:bg-gray-50 ${
                isEmbedded ? "px-2 py-2 text-[11px]" : "px-3 py-2.5 text-sm"
              }`}
            >
              <IconExternalLink className="h-4 w-4 shrink-0" />
              Профиль
            </Link>
            <button
              type="button"
              onClick={onWrite}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 font-medium text-white transition-all hover:from-emerald-600 hover:to-emerald-700 ${
                isEmbedded ? "px-2 py-2 text-[11px]" : "px-3 py-2.5 text-sm"
              }`}
            >
              <IconMessageSquare className="h-4 w-4 shrink-0" />
              Написать
            </button>
          </div>
          {showContactButton && onToggleContact ? (
            <button
              type="button"
              onClick={onToggleContact}
              className={`flex w-full items-center justify-center gap-2 rounded-xl border font-medium transition-all ${
                isInContacts
                  ? "border-red-300 text-red-600 hover:border-red-400 hover:bg-red-50"
                  : "border-emerald-300 text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50"
              } ${isEmbedded ? "px-2 py-2 text-[11px]" : "px-3 py-2.5 text-sm"}`}
            >
              {isInContacts ? (
                <>
                  <IconUserMinus className="h-4 w-4 shrink-0" />
                  Удалить из контактов
                </>
              ) : (
                <>
                  <IconUserPlus className="h-4 w-4 shrink-0" />
                  Добавить в контакты
                </>
              )}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
