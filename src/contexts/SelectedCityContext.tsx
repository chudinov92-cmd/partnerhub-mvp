"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { RUSSIA_LABEL } from "@/data/cities";

type SelectedCityContextValue = {
  selectedCity: string;
  setSelectedCity: (city: string) => void;
};

const SelectedCityContext = createContext<SelectedCityContextValue | null>(
  null,
);

export function SelectedCityProvider({ children }: { children: ReactNode }) {
  const [selectedCity, setSelectedCityState] = useState(RUSSIA_LABEL);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("selected_city");
    if (saved) setSelectedCityState(saved);
    else setSelectedCityState(RUSSIA_LABEL);
  }, []);

  const setSelectedCity = useCallback((city: string) => {
    setSelectedCityState(city);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("selected_city", city);
    }
  }, []);

  const value = useMemo(
    () => ({ selectedCity, setSelectedCity }),
    [selectedCity, setSelectedCity],
  );

  return (
    <SelectedCityContext.Provider value={value}>
      {children}
    </SelectedCityContext.Provider>
  );
}

export function useSelectedCity() {
  const ctx = useContext(SelectedCityContext);
  if (!ctx) {
    throw new Error("useSelectedCity must be used within SelectedCityProvider");
  }
  return ctx;
}
