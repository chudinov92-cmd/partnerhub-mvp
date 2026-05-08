import Link from "next/link";
import Image from "next/image";

const greenTitle =
  "font-[family-name:var(--font-about2-display)] font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-[#009966] to-emerald-700";

function HeroMapPattern() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.35]"
      aria-hidden
    >
      <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="about2-grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M40 0H0V40"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="0.5"
              opacity="0.35"
            />
          </pattern>
          <pattern
            id="about2-iso"
            width="56"
            height="48"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M28 4 52 16v16L28 44 4 30V14Z"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="0.6"
              opacity="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="#f8fafc" />
        <rect width="100%" height="100%" fill="url(#about2-iso)" />
        <rect width="100%" height="100%" fill="url(#about2-grid)" />
      </svg>
    </div>
  );
}

function IconMapPinHero({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="24" cy="32" r="5" fill="#34d399" opacity="0.85" />
      <circle cx="98" cy="48" r="4" fill="#10b981" opacity="0.7" />
      <circle cx="88" cy="22" r="3" fill="#059669" opacity="0.65" />
      <path
        d="M60 8c-18 0-32 14-32 32 0 24 32 72 32 72s32-48 32-72C92 22 78 8 60 8Z"
        fill="url(#pinGrad)"
      />
      <circle cx="60" cy="40" r="14" fill="white" />
      <defs>
        <linearGradient id="pinGrad" x1="36" y1="8" x2="92" y2="112" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34d399" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function IllustrationNetwork() {
  return (
    <svg viewBox="0 0 200 120" className="h-28 w-full max-w-[200px] shrink-0 sm:h-32" aria-hidden>
      <ellipse cx="100" cy="108" rx="70" ry="8" fill="#1d4ed8" opacity="0.2" />
      <circle cx="48" cy="38" r="16" fill="#bbf7d0" />
      <path d="M44 34h8v8h-8z" fill="#166534" opacity="0.35" />
      <circle cx="100" cy="28" r="12" fill="#93c5fd" />
      <circle cx="152" cy="40" r="14" fill="#bfdbfe" />
      <circle cx="128" cy="72" r="11" fill="#86efac" />
      <path d="M64 46 L92 34 M112 34 L140 42 M118 58 L132 50" stroke="white" strokeWidth="2" opacity="0.5" strokeLinecap="round" />
    </svg>
  );
}

function IllustrationChat() {
  return (
    <svg viewBox="0 0 200 120" className="h-28 w-full max-w-[200px] shrink-0 sm:h-32" aria-hidden>
      <ellipse cx="100" cy="108" rx="70" ry="8" fill="#1d4ed8" opacity="0.2" />
      <rect x="24" y="36" width="88" height="52" rx="8" fill="#dbeafe" />
      <rect x="92" y="22" width="84" height="40" rx="8" fill="white" stroke="#93c5fd" />
      <rect x="102" y="32" width="40" height="6" rx="2" fill="#60a5fa" opacity="0.5" />
      <rect x="102" y="44" width="56" height="6" rx="2" fill="#93c5fd" opacity="0.45" />
      <circle cx="44" cy="58" r="10" fill="#34d399" />
      <circle cx="156" cy="70" r="9" fill="#22c55e" />
    </svg>
  );
}

function IllustrationHandshake() {
  return (
    <svg viewBox="0 0 200 120" className="h-28 w-full max-w-[200px] shrink-0 sm:h-32" aria-hidden>
      <ellipse cx="100" cy="108" rx="70" ry="8" fill="#1d4ed8" opacity="0.2" />
      <path d="M72 78c-8-4-12-14-8-24l8-14c4-8 14-10 22-6l28 16 20-4c10-2 20 4 22 14l2 10c2 10-4 20-14 22l-36 8c-8 2-16-2-20-8l-24-18Z" fill="#bfdbfe" />
      <path d="M108 52l16 28c4 8 2 18-6 22l-8 4c-8 4-18 2-24-4L70 66" fill="#86efac" stroke="#166534" strokeWidth="1" opacity="0.9" />
      <circle cx="86" cy="44" r="10" fill="#1e3a8a" opacity="0.35" />
      <circle cx="124" cy="48" r="9" fill="#166534" opacity="0.35" />
    </svg>
  );
}

function PhoneMockup() {
  return (
    <div
      className="relative mx-auto w-[min(100%,220px)]"
      aria-hidden
    >
      <div className="relative aspect-[10/19] rounded-[2rem] border-[10px] border-slate-800 bg-slate-900 shadow-[0_24px_48px_rgba(15,23,42,0.25)]">
        <div className="absolute inset-[6px] overflow-hidden rounded-[1.35rem] bg-slate-100">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-sky-50 to-slate-100" />
          <div className="absolute left-1/2 top-[42%] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.25)]" />
          <div className="absolute left-[30%] top-[55%] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-emerald-600/90" />
          <div className="absolute left-[68%] top-[48%] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-emerald-500/80" />
          <div className="absolute bottom-3 left-0 right-0 text-center text-[9px] font-medium text-slate-500">
            Карта
          </div>
        </div>
      </div>
    </div>
  );
}

const ABOUT_BLOCKS = [
  {
    text:
      "Zeip объединяет специалистов и предпринимателей на одной карте: делитесь опытом, находите партнёров и стройте окружение для роста.",
    illustration: <IllustrationNetwork />,
  },
  {
    text:
      "Есть знания, которыми хочется поделиться? Помогайте другим, консультируйте и открывайте новые возможности для себя.",
    illustration: <IllustrationChat />,
  },
  {
    text:
      "Нужно решить задачу в бизнесе? Найдите специалистов рядом и договоритесь о формате помощи — быстро и по делу.",
    illustration: <IllustrationHandshake />,
  },
] as const;

const HOW_STEPS = [
  "зарегистрируйся",
  "заполни профиль",
  "найди тех, кто тебе нужен",
  "попроси совет",
  "открой возможности",
] as const;

export default function About2Page() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white">
      <a
        href="#about2-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[2000] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900 focus:shadow-lg"
      >
        Перейти к содержимому
      </a>

      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <Image
              src="/zeip-logo.svg"
              alt="Zeip"
              width={32}
              height={32}
              className="h-8 w-8 shrink-0"
            />
            <span className="truncate font-[family-name:var(--font-about2-display)] text-lg font-semibold text-slate-800">
              Zeip
            </span>
          </Link>
          <nav className="flex items-center gap-3 sm:gap-4" aria-label="Навигация">
            <Link
              href="/"
              className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:inline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            >
              Карта
            </Link>
            <Link
              href="/about"
              className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 md:inline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            >
              О проекте (v1)
            </Link>
          </nav>
        </div>
      </header>

      <main id="about2-main">
        {/* Hero */}
        <section
          className="relative border-b border-slate-100"
          aria-labelledby="about2-hero-title"
        >
          <HeroMapPattern />
          <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
            <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
              <div className="flex w-full flex-col items-center text-center lg:max-w-xl lg:items-start lg:text-left">
                <div className="flex flex-wrap items-end justify-center gap-4 lg:justify-start">
                  <h1
                    id="about2-hero-title"
                    className="font-[family-name:var(--font-about2-display)] text-5xl font-bold leading-none tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-[#009966] via-emerald-500 to-emerald-800 sm:text-6xl lg:text-7xl"
                    style={{ letterSpacing: "-0.04em" }}
                  >
                    Zeip
                  </h1>
                  <IconMapPinHero className="h-24 w-20 shrink-0 sm:h-28 sm:w-24" />
                </div>
                <p className="mt-4 text-xl font-semibold text-blue-600 sm:text-2xl">
                  Карта возможностей
                </p>
                <Link
                  href="/auth"
                  className="mt-8 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:text-base"
                >
                  Войти
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* О проекте — три синие карточки */}
        <section
          className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-18"
          aria-labelledby="about2-section-project"
        >
          <h2
            id="about2-section-project"
            className={`text-center text-3xl sm:text-4xl ${greenTitle}`}
            style={{ letterSpacing: "-0.02em" }}
          >
            О проекте
          </h2>
          <div className="mt-10 flex flex-col gap-6 lg:gap-8">
            {ABOUT_BLOCKS.map((block, i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white shadow-lg sm:p-8"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <p className="max-w-xl text-sm leading-relaxed text-white/95 sm:text-base">
                    {block.text}
                  </p>
                  <div className="flex justify-end sm:justify-center sm:pl-4">
                    {block.illustration}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Как работает */}
        <section
          className="border-t border-slate-100 bg-slate-50/80 py-14 sm:py-18"
          aria-labelledby="about2-how"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2
              id="about2-how"
              className={`text-center text-3xl sm:text-4xl ${greenTitle}`}
              style={{ letterSpacing: "-0.02em" }}
            >
              Как работает
            </h2>
            <div className="mx-auto mt-10 max-w-4xl">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {HOW_STEPS.slice(0, 3).map((step, i) => (
                  <div
                    key={i}
                    className="flex min-h-[100px] flex-col justify-center rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-sky-400 px-6 py-5 text-white shadow-md"
                  >
                    <span className="text-4xl font-bold leading-none opacity-95">
                      {i + 1}
                    </span>
                    <p className="mt-2 text-sm font-medium capitalize leading-snug sm:text-base">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mx-auto mt-4 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
                {HOW_STEPS.slice(3).map((step, i) => (
                  <div
                    key={i + 3}
                    className="flex min-h-[100px] flex-col justify-center rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-sky-400 px-6 py-5 text-white shadow-md"
                  >
                    <span className="text-4xl font-bold leading-none opacity-95">
                      {i + 4}
                    </span>
                    <p className="mt-2 text-sm font-medium capitalize leading-snug sm:text-base">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <h2
            className={`mx-auto max-w-3xl text-center text-2xl leading-tight sm:text-3xl lg:text-4xl ${greenTitle}`}
            style={{ letterSpacing: "-0.02em" }}
          >
            Создай свой профиль на карте возможностей
          </h2>
          <div className="mt-10 grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="flex justify-center lg:justify-end lg:pr-8">
              <Link
                href="/auth"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-10 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Создать профиль
              </Link>
            </div>
            <div className="flex justify-center lg:justify-start">
              <PhoneMockup />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-slate-700">
            <Image src="/zeip-logo.svg" alt="" width={28} height={28} />
            <span className="font-semibold">Zeip</span>
          </Link>
          <p className="text-center text-xs text-slate-500 sm:text-right">
            © {new Date().getFullYear()} Zeip ·{" "}
            <Link href="/" className="underline-offset-2 hover:underline">
              На карту
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
