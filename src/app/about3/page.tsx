import Image from "next/image";
import Link from "next/link";

const ASSET = (name: string) => `/assets/about3/${name}`;

const inter = "font-[family-name:var(--font-about3-inter)]";
const lato = "font-[family-name:var(--font-about3-lato)]";

const STEPS = [
  { n: "1", text: "зарегистрируйся" },
  { n: "2", text: "заполни профиль" },
  { n: "3", text: "найди тех,\nкто тебе нужен" },
  { n: "4", text: "попроси совет" },
  { n: "5", text: "открой возможности" },
] as const;

function StepCard({ n, text }: { n: string; text: string }) {
  return (
    <div
      className={`relative flex min-h-[180px] flex-col justify-end rounded-bl-[36px] rounded-tl-[36px] bg-gradient-to-r from-[#6366f1] to-[rgba(30,105,255,0)] px-6 pb-6 pt-14 sm:min-h-[200px] sm:px-8 sm:pb-8 ${lato}`}
    >
      <span className="absolute left-6 top-6 text-5xl font-bold leading-none text-[#f9fafb] sm:left-8 sm:top-7 sm:text-6xl md:text-[64px]">
        {n}
      </span>
      <p className="whitespace-pre-line text-2xl font-normal leading-snug text-white sm:text-3xl lg:text-4xl">
        {text}
      </p>
    </div>
  );
}

export default function About3Page() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f9fafb]">
      <a
        href="#about3-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[2000] focus:rounded-xl focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900 focus:shadow-lg"
      >
        Перейти к содержимому
      </a>

      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-[#f9fafb]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/zeip-logo.svg"
              alt="Zeip"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className={`text-lg font-bold text-[#10b981] ${inter}`}>
              Zeip
            </span>
          </Link>
          <nav className="flex items-center gap-3 text-sm" aria-label="Навигация">
            <Link
              href="/"
              className="hidden font-medium text-slate-600 hover:text-slate-900 sm:inline"
            >
              Карта
            </Link>
            <Link
              href="/auth"
              className={`rounded-2xl bg-[#6366f1] px-4 py-2 font-semibold text-white shadow-md transition hover:opacity-95 ${lato}`}
            >
              Войти
            </Link>
          </nav>
        </div>
      </header>

      <main id="about3-main">
        {/* Hero */}
        <section
          className="relative isolate min-h-[min(85vh,720px)] w-full overflow-hidden"
          aria-labelledby="about3-hero-zeip"
        >
          <div className="absolute inset-0 z-0">
            <Image
              src={ASSET("hero-bg.png")}
              alt=""
              fill
              className="object-cover object-[center_20%]"
              priority
              sizes="100vw"
            />
          </div>
          <div className="pointer-events-none absolute right-[2%] top-[8%] z-[1] w-[min(42vw,420px)] max-sm:right-0 max-sm:top-[12%] max-sm:w-[min(55vw,240px)] sm:right-[4%] sm:top-[6%]">
            <Image
              src={ASSET("hero-pin.png")}
              alt=""
              width={800}
              height={700}
              className="h-auto w-full object-contain"
              priority
            />
          </div>

          <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:items-start lg:pt-20">
            <div className="w-full text-center lg:text-left">
              <h1
                id="about3-hero-zeip"
                className={`${inter} text-[clamp(4.5rem,18vw,20rem)] font-semibold leading-[1.05] tracking-tight text-[#10b981] drop-shadow-[0_12px_28px_rgba(0,0,0,0.08)] sm:text-[clamp(5rem,14vw,20rem)]`}
                style={{
                  textShadow:
                    "0 20px 44px rgba(0,0,0,0.1), 0 80px 80px rgba(0,0,0,0.09)",
                }}
              >
                Zeip
              </h1>
              <p
                className={`${inter} mt-2 text-2xl font-medium text-[#6366f0] sm:mt-4 sm:text-4xl md:text-5xl lg:text-[60px] lg:leading-[1.3]`}
              >
                Карта возможностей
              </p>
              <div className="mt-8 flex justify-center lg:justify-start">
                <Link
                  href="/auth"
                  className={`inline-flex min-h-14 min-w-[200px] items-center justify-center rounded-3xl bg-[#6366f1] px-8 text-2xl font-semibold text-white shadow-[0_7px_15px_rgba(0,0,0,0.1),0_26px_26px_rgba(0,0,0,0.09)] transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 sm:min-h-16 sm:min-w-[240px] sm:text-4xl ${lato}`}
                >
                  Войти
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* О проекте */}
        <section
          className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20"
          aria-labelledby="about3-title-project"
        >
          <h2
            id="about3-title-project"
            className={`text-center text-4xl font-bold leading-tight text-[#12b881] sm:text-6xl md:text-7xl lg:text-[96px] ${lato}`}
          >
            О проекте
          </h2>

          <div className="mt-10 flex flex-col gap-8 sm:mt-14 sm:gap-10 lg:gap-12">
            {/* Карточка 1 */}
            <article className="relative">
              <div
                className={`relative overflow-hidden rounded-bl-[36px] rounded-tr-[36px] bg-[#6366f1] px-6 py-8 text-[#f9fafb] shadow-lg sm:px-8 sm:py-10 lg:pr-[min(42%,380px)] ${lato}`}
              >
                <p className="text-2xl font-bold leading-normal sm:text-3xl lg:text-4xl">
                  Мы решили объединить специалистов, предпринимателей и деятелей
                  искусства, готовых брать от жизни больше, чем она даёт, и
                  показать, что рядом есть люди, готовые двигаться вместе вперёд.
                </p>
                <div className="relative mt-6 flex justify-center sm:mt-8 lg:absolute lg:bottom-0 lg:right-4 lg:mt-0 lg:w-[min(48%,420px)]">
                  <Image
                    src={ASSET("illustration-vectorized.png")}
                    alt=""
                    width={647}
                    height={644}
                    className="h-auto max-h-[280px] w-full max-w-md object-contain object-bottom sm:max-h-[340px] lg:max-h-none lg:translate-y-4"
                  />
                </div>
              </div>
            </article>

            {/* Карточка 2 */}
            <article className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-6">
              <div
                className={`relative z-10 flex-1 rounded-bl-[36px] rounded-tr-[36px] bg-[#6366f1] px-6 py-8 text-white shadow-lg sm:px-8 sm:py-10 ${lato}`}
              >
                <h3 className="text-2xl font-bold leading-snug sm:text-3xl lg:text-4xl">
                  Есть знания, которыми
                  <br />
                  ты готов поделиться?
                </h3>
                <p className="mt-4 text-lg leading-normal sm:text-2xl lg:text-[32px]">
                  Заяви о себе, помоги другим и открой для себя новые возможности.
                  Стань партнёром, а не линейным сотрудником в проектах, которые
                  интересны тебе.
                </p>
              </div>
              <div className="relative z-0 flex justify-center lg:-ml-8 lg:w-[min(48%,400px)] lg:shrink-0">
                <Image
                  src={ASSET("illustration-32.png")}
                  alt=""
                  width={785}
                  height={618}
                  className="h-auto w-full max-w-lg object-contain drop-shadow-md lg:max-w-none"
                />
              </div>
            </article>

            {/* Карточка 3 */}
            <article className="relative flex flex-col gap-4 lg:flex-row-reverse lg:items-end lg:gap-6">
              <div
                className={`relative z-10 flex-1 rounded-bl-[36px] rounded-tr-[36px] bg-[#6366f1] px-6 py-8 text-white shadow-lg sm:px-8 sm:py-10 ${lato}`}
              >
                <h3 className="text-2xl font-bold leading-snug sm:text-3xl lg:text-4xl">
                  Есть задача, которую нужно
                  <br />
                  быстро и качественно решить?
                </h3>
                <p className="mt-4 text-lg leading-normal sm:text-2xl lg:text-[32px]">
                  Обратись к специалисту, готовому помочь, найди лучшего и сделай
                  его частью своей команды.
                </p>
              </div>
              <div className="relative z-0 flex justify-center lg:-mr-4 lg:w-[min(40%,360px)] lg:shrink-0">
                <Image
                  src={ASSET("illustration-34.png")}
                  alt=""
                  width={387}
                  height={487}
                  className="h-auto w-full max-w-xs object-contain drop-shadow-md sm:max-w-sm lg:max-w-none"
                />
              </div>
            </article>
          </div>
        </section>

        {/* Как работает */}
        <section
          className="border-t border-slate-200/60 bg-[#f9fafb] px-4 py-12 sm:px-6 sm:py-16 lg:py-20"
          aria-labelledby="about3-how"
        >
          <div className="mx-auto max-w-6xl">
            <h2
              id="about3-how"
              className={`text-center text-4xl font-bold text-[#12b881] sm:text-6xl md:text-7xl lg:text-[96px] ${lato}`}
            >
              Как работает
            </h2>
            <div className="mx-auto mt-10 max-w-5xl space-y-4 sm:mt-14">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {STEPS.slice(0, 3).map((s) => (
                  <StepCard key={s.n} n={s.n} text={s.text} />
                ))}
              </div>
              <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
                {STEPS.slice(3).map((s) => (
                  <StepCard key={s.n} n={s.n} text={s.text} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Финальный CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6 sm:pb-24 lg:pb-28">
          <h2
            className={`mx-auto max-w-5xl text-center text-4xl font-bold leading-tight text-[#12b881] sm:text-5xl md:text-6xl lg:text-[96px] ${lato}`}
          >
            Создай свой профиль
            <br />
            на карте возможностей
          </h2>

          <div className="mt-10 flex flex-col items-center gap-10 lg:mt-14 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
            <Link
              href="/auth"
              className={`inline-flex min-h-16 w-full max-w-md items-center justify-center rounded-3xl bg-[#6366f1] px-8 text-2xl font-semibold text-white shadow-[0_7px_15px_rgba(0,0,0,0.1),0_26px_26px_rgba(0,0,0,0.09)] transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 sm:text-4xl lg:w-auto lg:min-w-[443px] ${lato}`}
            >
              Создать профиль
            </Link>
            <div className="relative w-full max-w-[min(100%,747px)] shrink-0 lg:max-w-[55%]">
              <Image
                src={ASSET("phone-mockup.png")}
                alt="Мобильное приложение Zeip на экране смартфона"
                width={747}
                height={667}
                className="h-auto w-full object-contain drop-shadow-xl"
                sizes="(max-width: 1024px) 100vw, 55vw"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white/80 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-slate-500 sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} Zeip</span>
          <Link href="/" className="underline-offset-2 hover:underline">
            На карту
          </Link>
        </div>
      </footer>
    </div>
  );
}
