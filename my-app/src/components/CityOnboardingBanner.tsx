export function CityOnboardingBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="relative mt-2 w-full min-w-[10rem] max-w-[12rem] rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 pt-2 text-center text-[11px] font-medium leading-snug text-emerald-900 shadow-sm sm:w-48 sm:max-w-none sm:text-xs"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-l border-t border-emerald-200 bg-emerald-50"
      />
      Выберите город
    </div>
  );
}
