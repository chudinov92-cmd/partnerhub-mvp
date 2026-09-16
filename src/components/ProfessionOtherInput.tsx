"use client";

import { useMemo, useState, type Ref } from "react";
import {
  findSimilarProfessions,
  getProfessionResolvePreview,
  normalizeProfessionKey,
  type ProfessionCatalogRow,
} from "@/lib/professionCatalog";

type ProfessionOtherInputProps = {
  value: string;
  onChange: (value: string) => void;
  catalog: ProfessionCatalogRow[];
  onResolved: (canonicalLabel: string) => void;
  dismissedKeys?: ReadonlySet<string>;
  onDismissSuggestion?: (input: string) => void;
  placeholder?: string;
  className?: string;
  inputRef?: Ref<HTMLInputElement>;
  autoFocus?: boolean;
  maxLength?: number;
};

export function ProfessionOtherInput({
  value,
  onChange,
  catalog,
  onResolved,
  dismissedKeys,
  onDismissSuggestion,
  placeholder = "Введите профессию",
  className,
  inputRef,
  autoFocus,
  maxLength = 40,
}: ProfessionOtherInputProps) {
  const [inlineSuggestion, setInlineSuggestion] = useState<string | null>(null);

  const preview = useMemo(
    () => getProfessionResolvePreview(catalog, value, { dismissedKeys }),
    [catalog, dismissedKeys, value],
  );

  const handleBlur = () => {
    if (!value.trim()) {
      setInlineSuggestion(null);
      return;
    }

    if (preview?.action === "canonical") {
      setInlineSuggestion(null);
      onResolved(preview.label);
      return;
    }

    if (preview?.action === "suggest") {
      setInlineSuggestion(preview.label);
      return;
    }

    const similar = findSimilarProfessions(catalog, value, { limit: 1 })[0];
    setInlineSuggestion(similar?.label ?? null);
  };

  const handleFocus = () => {
    if (preview?.action === "suggest") {
      setInlineSuggestion(preview.label);
    }
  };

  const handleChange = (next: string) => {
    onChange(next.slice(0, maxLength));
    const key = normalizeProfessionKey(next);
    if (inlineSuggestion && normalizeProfessionKey(inlineSuggestion) !== key) {
      setInlineSuggestion(null);
    }
  };

  const acceptSuggestion = () => {
    if (!inlineSuggestion) return;
    setInlineSuggestion(null);
    onResolved(inlineSuggestion);
  };

  const dismissSuggestion = () => {
    onDismissSuggestion?.(value);
    setInlineSuggestion(null);
  };

  return (
    <div>
      <input
        ref={inputRef}
        autoFocus={autoFocus}
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        maxLength={maxLength}
        className={className}
      />
      {inlineSuggestion ? (
        <p className="mt-1.5 text-xs leading-snug text-slate-500">
          Похоже на «{inlineSuggestion}».{" "}
          <button
            type="button"
            className="font-medium text-[#009966] underline-offset-2 hover:underline"
            onMouseDown={(e) => e.preventDefault()}
            onClick={acceptSuggestion}
          >
            Нажмите, чтобы выбрать
          </button>
          {" · "}
          <button
            type="button"
            className="text-slate-500 underline-offset-2 hover:underline"
            onMouseDown={(e) => e.preventDefault()}
            onClick={dismissSuggestion}
          >
            оставить своё
          </button>
        </p>
      ) : null}
    </div>
  );
}
