import { Suspense } from "react";
import { LandingFooter } from "@/app/landing/components/LandingFooter";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh flex-col bg-[#f6f8f7] bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(0,153,102,0.14),transparent)]">
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-slate-500">Загрузка…</p>
          </div>
          <LandingFooter />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
