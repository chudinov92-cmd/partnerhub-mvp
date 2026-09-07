import { cookies } from "next/headers";
import { Suspense } from "react";
import { PaymentSuccessView } from "@/components/PaymentSuccessView";
import { isPaidGateMode } from "@/lib/accessMode";
import { createSupabaseRouteClient } from "@/lib/supabaseServer";

export default async function PaymentSuccessPage() {
  const cookieStore = await cookies();
  const sb = createSupabaseRouteClient(cookieStore);
  const {
    data: { user },
  } = await sb.auth.getUser();

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
          Загрузка…
        </div>
      }
    >
      <PaymentSuccessView
        initialUserId={user?.id ?? null}
        successRedirectPath={
          isPaidGateMode() ? "/map?payment=success" : "/map"
        }
        subscriptionLabel={isPaidGateMode() ? "Zeip" : "Pro"}
      />
    </Suspense>
  );
}
