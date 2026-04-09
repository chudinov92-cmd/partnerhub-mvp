export default function AboutLoading() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 sm:px-6 sm:py-4 md:grid-cols-[auto_1fr_auto]">
          <div className="flex min-w-0 items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-slate-200" />
            <div className="h-5 w-20 rounded bg-slate-200" />
          </div>
          <div className="hidden h-4 w-56 justify-self-center rounded bg-slate-200 md:block" />
          <div className="flex justify-end gap-2">
            <div className="h-10 w-20 rounded-lg bg-slate-200" />
            <div className="h-10 w-28 rounded-lg bg-slate-200" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="rounded-2xl border border-white/[0.12] bg-white/[0.75] p-6 shadow-sm sm:p-8">
          <div className="h-4 w-44 rounded bg-slate-200" />
          <div className="mt-4 h-10 w-[min(520px,100%)] rounded bg-slate-200" />
          <div className="mt-3 h-4 w-[min(440px,100%)] rounded bg-slate-200" />
          <div className="mt-6 flex gap-3">
            <div className="h-11 w-32 rounded-lg bg-slate-200" />
            <div className="h-11 w-40 rounded-lg bg-slate-200" />
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="h-20 rounded-xl bg-slate-200" />
            <div className="h-20 rounded-xl bg-slate-200" />
            <div className="h-20 rounded-xl bg-slate-200" />
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-6">
          <div className="h-40 rounded-2xl bg-white/75" />
          <div className="h-40 rounded-2xl bg-white/75" />
        </div>
      </main>
    </div>
  );
}

