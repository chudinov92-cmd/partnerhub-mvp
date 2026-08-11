"use client";

import { Suspense } from "react";
import { PaymentSuccessView } from "@/components/PaymentSuccessView";
import { isPaidGateMode } from "@/lib/accessMode";

function PaymentSuccessContent() {
  return (
    <PaymentSuccessView
      successRedirectPath={
        isPaidGateMode() ? "/map?payment=success" : "/map"
      }
      subscriptionLabel={isPaidGateMode() ? "Zeip" : "Pro"}
    />
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
          Загрузка…
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
