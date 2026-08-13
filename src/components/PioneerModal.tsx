"use client";

import { useRouter } from "next/navigation";
import FocusTrap from "focus-trap-react";

type PioneerModalProps = {
  open: boolean;
  onClose: () => void;
};

export function PioneerModal({ open, onClose }: PioneerModalProps) {
  const router = useRouter();

  if (!open) return null;

  const goToMap = () => {
    onClose();
    router.push("/map");
  };

  return (
    <div
      className="fixed inset-0 z-[2200] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pioneer-modal-title"
    >
      <FocusTrap
        active={open}
        focusTrapOptions={{
          returnFocusOnDeactivate: true,
          escapeDeactivates: false,
        }}
      >
        <div className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white p-6 shadow-xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
            🎉
          </div>
          <h2
            id="pioneer-modal-title"
            className="text-xl font-bold text-slate-900"
          >
            Ура! Вы один из первых в вашем городе
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Дарим вам бесплатную подписку на 90 дней — все функции Zeip уже
            доступны.
          </p>
          <button
            type="button"
            onClick={goToMap}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700"
          >
            На карту
          </button>
        </div>
      </FocusTrap>
    </div>
  );
}
