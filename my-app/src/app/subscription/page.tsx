"use client";

import { isPaidGateMode } from "@my-startup/auth";
import SubscriptionPlansView from "./SubscriptionPlansView";

export default function SubscriptionPage() {
  return (
    <SubscriptionPlansView variant={isPaidGateMode() ? "paid_gate" : "freemium"} />
  );
}
