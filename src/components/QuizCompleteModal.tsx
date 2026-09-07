"use client";

import { useRouter } from "next/navigation";
import FocusTrap from "focus-trap-react";

type QuizCompleteModalProps = {
  open: boolean;
  onClose: () => void;
};

export function QuizCompleteModal({ open, onClose }: QuizCompleteModalProps) {
  const router = useRouter();

  if (!open) return null;

  const goToMap = () => {
    onClose();
    router.push("/map");
  };

  return (
    <div
      className="fixed inset-0 z-[2200] flex items-center justify-center bg-slate-900/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-complete-modal-title"
    >
      <FocusTrap
        active={open}
        focusTrapOptions={{
          returnFocusOnDeactivate: true,
          escapeDeactivates: false,
        }}
      >
        <div className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white p-6 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
            🎉
          </div>
          <h2
            id="quiz-complete-modal-title"
            className="text-xl font-bold tracking-tight text-slate-900"
          >
            Ваш профиль добавлен на карту
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Дополнить или изменить информацию о себе можно в разделе{" "}
            <strong className="font-semibold text-slate-800">Профиль</strong>.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Управлять видимостью профиля — в разделе{" "}
            <strong className="font-semibold text-slate-800">Настройки</strong>.
          </p>
          <button
            type="button"
            onClick={goToMap}
            className="mt-6 h-12 w-full rounded-2xl bg-[#009966] px-4 text-sm font-semibold text-white shadow-sm active:bg-[#007a52]"
          >
            На карту
          </button>
        </div>
      </FocusTrap>
    </div>
  );
}
