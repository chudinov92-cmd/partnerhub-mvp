"use client";

export type PaymentStatusResponse = {
  status: "pending" | "paid";
  isPro: boolean;
  proExpiresAt: string | null;
};

export async function fetchPaymentStatusByInvId(
  invId: string,
): Promise<PaymentStatusResponse> {
  const res = await fetch(
    `/api/subscription/payment-status?invId=${encodeURIComponent(invId)}`,
    { credentials: "include" },
  );

  if (!res.ok) {
    let message = "Не удалось проверить статус оплаты";
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      //
    }
    throw new Error(message);
  }

  return (await res.json()) as PaymentStatusResponse;
}
