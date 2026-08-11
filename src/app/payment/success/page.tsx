"use client";

import { Suspense } from "react";
import { PaymentSuccessView } from "@/components/PaymentSuccessView";

function PaymentSuccessContent() {
  return (
    <PaymentSuccessView
      successRedirectPath="/map"
      subscriptionLabel="Pro"
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
