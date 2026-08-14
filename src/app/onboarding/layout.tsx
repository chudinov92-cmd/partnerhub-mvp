import { Suspense } from "react";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#f6f8f7] bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(0,153,102,0.14),transparent)]">
          <p className="text-sm text-slate-500">Загрузка…</p>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
