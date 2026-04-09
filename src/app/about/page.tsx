import Image from "next/image";
import Link from "next/link";

type AboutState = "default" | "empty" | "error" | "disabled";

function GlassPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.12] bg-white/[0.06] shadow-[0_12px_32px_rgba(26,27,33,0.06)] backdrop-blur-[24px] ${className}`}
    >
      {children}
    </div>
  );
}

function ActionButton({
  href,
  children,
  variant = "primary",
  disabled = false,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  className?: string;
}) {
  const base =
    "inline-flex min-h-11 items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950/10 sm:px-8 sm:py-3.5 sm:text-base";

  const styles =
    variant === "primary"
      ? "bg-gradient-to-br from-[#009966] to-emerald-800 text-white shadow-lg hover:opacity-95"
      : "border border-white/20 bg-white/10 text-white shadow-sm hover:bg-white/15";

  const disabledStyles =
    "cursor-not-allowed opacity-60 hover:bg-white/10 hover:opacity-60";

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={`${base} ${styles} ${disabledStyles} ${className}`}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={`${base} ${styles} ${className}`}
    >
      {children}
    </Link>
  );
}

const AUDIENCE_CARDS = [
  {
    title: "Специалисты",
    body:
      "Делитесь своим опытом и знаниями с теми, кому они действительно важны. Устанавливайте связи с коллегами и предпринимателями, будьте полезны и открывайте себе возможности на рынке для трудоустройства или предпринимательства.",
  },
  {
    title: "Предприниматели",
    body:
      "Решайте вопросы бизнеса быстро. Находите специалистов для решения задач, консультируйтесь, делитесь опытом, вовлекайте в свои проекты тех, кто приносит вам пользу.",
  },
  {
    title: "Студенты",
    body:
      "Общайтесь с профессионалами, получайте опыт и заводите связи. Возьмите будущее в свои руки. Учитесь, присоединяйтесь и создавайте. Будьте на шаг впереди!",
  },
  {
    title: "Основатели",
    body:
      "Собери свою команду из людей, готовых двигаться вперед. Ищи людей, которые помогут тебе вырасти. Запускай проекты, открывай стартапы и меняй свой мир в нужную тебе форму и направление.",
  },
] as const;

const HOW_STEPS = [
  "Зарегистрируйся и создай профиль.",
  "Открой фильтр и найди тех, кто тебе нужен.",
  "Добавь в контакты или напиши первым.",
  "Получи или сам дай консультацию.",
  "Открывай возможности и пользуйся ими.",
] as const;

function EmptyState({
  title,
  body,
  actionHref,
  actionLabel,
}: {
  title: string;
  body: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <GlassPanel className="mt-8 p-6 sm:p-8">
      <div className="flex flex-col gap-3">
        <h3 className="text-base font-bold text-[#0F172B]">{title}</h3>
        <p className="text-sm leading-relaxed text-[#0F172B]/75">{body}</p>
        <div className="pt-1">
          <ActionButton href={actionHref} variant="secondary">
            {actionLabel}
          </ActionButton>
        </div>
      </div>
    </GlassPanel>
  );
}

export default function AboutPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const state = (searchParams?.state ?? "default") as AboutState;
  if (state === "error") {
    throw new Error("About page error state");
  }

  const audienceCards = state === "empty" ? ([] as const) : AUDIENCE_CARDS;
  const howSteps = state === "empty" ? ([] as const) : HOW_STEPS;
  const ctaDisabled = state === "disabled";

  return (
    <div className="relative min-h-screen overflow-x-hidden text-slate-100">
      {/* Фон фиксирован при скролле; затемнение убрано */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <Image
          src="/about-bg.jpg"
          alt=""
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
          quality={85}
        />
      </div>

      <div className="relative z-10">
        <a
          href="#about-main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[2000] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900 focus:shadow-lg"
        >
          Перейти к содержимому
        </a>

        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
          <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 sm:px-6 sm:py-4 md:grid-cols-[auto_1fr_auto]">
            <Link href="/" className="flex min-w-0 items-center gap-2">
              <Image
                src="/zeip-logo.svg"
                alt="Zeip"
                width={36}
                height={36}
                className="h-9 w-9 shrink-0"
                priority
              />
              <span className="truncate text-xl font-semibold text-slate-900">
                Zeip
              </span>
            </Link>

            <nav
              className="hidden items-center justify-center gap-8 md:flex"
              aria-label="Навигация"
            >
              <Link
                href="/"
                className="text-sm font-medium text-slate-700 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Карта
              </Link>
              <span
                className="text-sm font-semibold text-slate-900"
                aria-current="page"
              >
                О проекте
              </span>
            </nav>

            <div className="flex items-center justify-end gap-2 sm:gap-3">
              <Link
                href="/auth"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-gray-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Войти
              </Link>
              <ActionButton
                href="/auth"
                disabled={ctaDisabled}
                className="px-4 py-2 text-sm sm:px-5 sm:py-2.5 sm:text-sm"
              >
                Регистрация
              </ActionButton>
            </div>
          </div>
        </header>

        <main id="about-main" className="text-white">
          {/* 1. Hero */}
          <section className="relative mx-auto max-w-6xl px-4 pb-14 pt-8 sm:px-6 sm:pb-20 sm:pt-12">
            <GlassPanel className="relative overflow-hidden p-0">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-28 -top-28 h-72 w-72 rounded-full bg-emerald-500/18 blur-3xl" />
                <div className="absolute -bottom-36 -right-28 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
              </div>

              <div className="relative grid gap-8 p-6 sm:gap-10 sm:p-8 lg:grid-cols-12 lg:items-center lg:gap-12 lg:p-10 xl:p-12">
                <div className="order-2 lg:order-1 lg:col-span-6">
                  <h1
                    className="mt-5 font-[family-name:var(--font-landing-display)] text-3xl font-bold leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-5xl"
                    style={{ letterSpacing: "-0.03em" }}
                  >
                    Создай свой профиль на карте возможностей
                  </h1>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <ActionButton
                      href="/"
                      disabled={ctaDisabled}
                      className="w-full sm:w-auto"
                    >
                      Создать
                    </ActionButton>
                  </div>
                </div>

                <div className="order-1 lg:order-2 lg:col-span-6">
                  <div className="relative aspect-[16/11] overflow-hidden p-2 sm:aspect-[16/10] sm:p-3 lg:aspect-[16/12] lg:p-4">
                    <Image
                      src="/about-hero.svg"
                      alt=""
                      fill
                      className="object-contain object-center"
                      priority
                      unoptimized
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                  </div>
                </div>
              </div>
            </GlassPanel>
          </section>

          {/* 2. Для кого сервис */}
          <section
            className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-18"
            aria-labelledby="about-audience"
          >
            <div className="flex flex-col gap-2">
              <h2
                id="about-audience"
                className="font-[family-name:var(--font-landing-display)] text-2xl font-bold tracking-tight text-white sm:text-3xl"
                style={{ letterSpacing: "-0.02em" }}
              >
                Для кого сервис
              </h2>
            </div>

            {audienceCards.length === 0 ? (
              <EmptyState
                title="Пока нет карточек аудитории"
                body="Этот блок пустой в режиме проверки empty-state. Вернись в обычный режим или перейди на карту."
                actionHref="/"
                actionLabel="На карту"
              />
            ) : (
              <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-6">
                {audienceCards.map((card) => (
                  <GlassPanel key={card.title} className="p-6 sm:p-8">
                    <h3 className="font-[family-name:var(--font-landing-display)] text-lg font-bold text-emerald-400">
                      {card.title}
                    </h3>
                    <p className="mt-4 text-sm leading-relaxed text-white/85 sm:text-base">
                      {card.body}
                    </p>
                  </GlassPanel>
                ))}
              </div>
            )}
          </section>

          {/* 3. Как работает */}
          <section
            className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-18"
            aria-labelledby="about-how"
          >
            <h2
              id="about-how"
              className="font-[family-name:var(--font-landing-display)] text-2xl font-bold tracking-tight text-white sm:text-3xl"
              style={{ letterSpacing: "-0.02em" }}
            >
              Как работает
            </h2>

            {howSteps.length === 0 ? (
              <EmptyState
                title="Пока нет шагов"
                body="Этот блок пустой в режиме проверки empty-state. Вернись в обычный режим или зарегистрируйся."
                actionHref="/auth"
                actionLabel="Перейти к регистрации"
              />
            ) : (
              <ol className="mt-8 space-y-4 sm:mt-10">
                {howSteps.map((step, i) => (
                  <li key={i}>
                    <GlassPanel className="flex gap-4 p-5 sm:gap-6 sm:p-6">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-400"
                        aria-hidden
                      >
                        {i + 1}
                      </span>
                      <p className="pt-1 text-sm leading-relaxed text-white/85 sm:text-base">
                        {step}
                      </p>
                    </GlassPanel>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* 4. О проекте */}
          <section
            className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-18"
            aria-labelledby="about-project"
          >
            <h2
              id="about-project"
              className="font-[family-name:var(--font-landing-display)] text-2xl font-bold tracking-tight text-white sm:text-3xl"
              style={{ letterSpacing: "-0.02em" }}
            >
              О проекте
            </h2>
            <GlassPanel className="mt-8 p-6 sm:mt-10 sm:p-10">
              <div className="space-y-4 text-sm leading-relaxed text-white/85 sm:text-base">
                <p>
                  Мы с другом решили узнать, сколько людей в нашей стране, готовых трудиться
                  сегодня, чтобы их завтрашний день стал лучше. Сколько людей, готовых поделиться
                  знаниями и умениями, которые готовы помочь друг другу, есть рядом с нами. Сколько
                  людей, готовых сделать первый шаг, не требующий от них денег или обязательств
                  перед другими.
                </p>
                <p>
                  Цель нашего проекта — показать, что мы не одни, что рядом с нами есть люди,
                  готовые двигаться вперёд. А если вы после регистрации оказались один в своём
                  городе, то спешу вас успокоить: вы не один — вы первый!
                </p>
                <p>
                  Мы с партнёром уже отметили свои точки на карте возможностей. Отметь себя на
                  карте и ты!
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center">
                <ActionButton href="/auth" disabled={ctaDisabled}>
                  Зарегистрироваться
                </ActionButton>
                <ActionButton href="/" variant="secondary" disabled={ctaDisabled}>
                  Открыть карту
                </ActionButton>
              </div>

              <p className="mt-5 text-xs text-white/60">
                Для проверки состояний: добавь параметр{" "}
                <span className="font-mono">?state=empty</span>,{" "}
                <span className="font-mono">?state=disabled</span> или{" "}
                <span className="font-mono">?state=error</span>.
              </p>
            </GlassPanel>
          </section>
        </main>

      {/* 5. Подвал */}
      <footer className="border-t border-white/[0.12] bg-slate-950/50 py-10 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2"
          >
            <Image
              src="/zeip-logo.svg"
              alt="Zeip"
              width={32}
              height={32}
              className="h-8 w-8 shrink-0"
            />
            <span className="truncate text-lg font-semibold text-slate-100">
              Zeip
            </span>
          </Link>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
            <Link href="/" className="transition hover:text-slate-300">
              На карту
            </Link>
            <Link href="/auth" className="transition hover:text-slate-300">
              Вход и регистрация
            </Link>
            <span className="text-slate-600">© {new Date().getFullYear()} Zeip</span>
          </nav>
        </div>
      </footer>
      </div>
    </div>
  );
}
