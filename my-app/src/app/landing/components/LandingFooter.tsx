import Link from "next/link";

const SUPPORT_EMAIL = "support@zeip.ru";

const linkClassName =
  "text-white/90 no-underline transition-colors hover:text-white hover:underline";

export function LandingFooter() {
  return (
    <footer className="footer flex min-h-[173px] w-full items-center bg-[#111827]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-center gap-x-6 gap-y-4 px-4 py-8 text-sm text-white/75 sm:px-8">
        <Link href="/terms" className={linkClassName}>
          Условия
        </Link>
        <Link href="/terms/privacy" className={linkClassName}>
          Политика обработки персональных данных
        </Link>
        <Link href="/terms/consent" className={linkClassName}>
          Согласие на обработку персональных данных
        </Link>
        <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClassName}>
          {SUPPORT_EMAIL}
        </a>
        <span className="opacity-65">ООО «ЗЕИП» · ИНН 5906189643</span>
      </div>
    </footer>
  );
}
