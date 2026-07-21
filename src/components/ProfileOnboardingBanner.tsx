import Link from "next/link";

export function ProfileOnboardingBanner() {
  return (
    <Link
      href="/profile"
      role="status"
      aria-live="polite"
      className="relative whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 py-1.5 pl-2 pr-3.5 text-[10px] font-medium leading-snug text-emerald-900 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100/80 sm:pl-2.5 sm:pr-4 sm:text-xs"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-1/2 h-3 w-3 translate-x-1/2 -translate-y-1/2 rotate-45 border-r border-t border-emerald-200 bg-emerald-50"
      />
      Заполните профиль
    </Link>
  );
}
