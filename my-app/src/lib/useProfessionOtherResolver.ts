"use client";

import { useCallback, useRef, useState } from "react";
import {
  normalizeProfessionKey,
  type ProfessionCatalogRow,
} from "@/lib/professionCatalog";
import {
  resolveProfessionForSave,
  type ProfessionResolveResult,
} from "@/lib/professionOtherResolve";

type PendingModal = {
  input: string;
  suggestion: string;
};

export function useProfessionOtherResolver(catalog: ProfessionCatalogRow[]) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInput, setModalInput] = useState("");
  const [modalSuggestion, setModalSuggestion] = useState("");
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(() => new Set());
  const pendingRef = useRef<((result: ProfessionResolveResult) => void) | null>(null);

  const dismissSuggestion = useCallback((input: string) => {
    const key = normalizeProfessionKey(input);
    if (!key) return;
    setDismissedKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalInput("");
    setModalSuggestion("");
  }, []);

  const resolveForSave = useCallback(
    (
      input: string | null | undefined,
      catalogOverride?: ProfessionCatalogRow[],
    ): Promise<ProfessionResolveResult> => {
      const activeCatalog = catalogOverride ?? catalog;
      const preview = resolveProfessionForSave(activeCatalog, input, { dismissedKeys });

      if (preview.action === "canonical" || preview.action === "custom") {
        return Promise.resolve(preview);
      }

      if (preview.action === "suggest") {
        return new Promise((resolve) => {
          pendingRef.current = resolve;
          setModalInput(preview.input);
          setModalSuggestion(preview.label);
          setModalOpen(true);
        });
      }

      return Promise.resolve({ action: "cancel" });
    },
    [catalog, dismissedKeys],
  );

  const confirmCanonical = useCallback(() => {
    const suggestion = modalSuggestion;
    closeModal();
    pendingRef.current?.({ action: "canonical", label: suggestion });
    pendingRef.current = null;
  }, [closeModal, modalSuggestion]);

  const confirmCustom = useCallback(() => {
    const input = modalInput;
    dismissSuggestion(input);
    closeModal();
    pendingRef.current?.({ action: "custom", label: input.trim() });
    pendingRef.current = null;
  }, [closeModal, dismissSuggestion, modalInput]);

  const dismissModal = useCallback(() => {
    closeModal();
    pendingRef.current?.({ action: "cancel" });
    pendingRef.current = null;
  }, [closeModal]);

  return {
    modalOpen,
    modalInput,
    modalSuggestion,
    dismissedKeys,
    dismissSuggestion,
    resolveForSave,
    confirmCanonical,
    confirmCustom,
    dismissModal,
    closeModal,
  };
}
