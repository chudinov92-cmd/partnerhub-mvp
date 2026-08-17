"use client";

import { isPaidGateMode } from "@/lib/accessMode";
import SubscriptionPlansView from "./SubscriptionPlansView";

export default function SubscriptionPage() {
  return (
    <SubscriptionPlansView variant={isPaidGateMode() ? "paid_gate" : "freemium"} />
  );
}
