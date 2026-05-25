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

export const SELECTED_CITY_STORAGE_KEY = "selected_city";
export const DEFAULT_SELECTED_CITY = "Пермь";

type SelectedCityContextValue = {
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  cityInitDone: boolean;
  cityResolving: boolean;
  setCityInitDone: (done: boolean) => void;
  setCityResolving: (resolving: boolean) => void;
};

const SelectedCityContext = createContext<SelectedCityContextValue | null>(
  null,
);

export function SelectedCityProvider({ children }: { children: ReactNode }) {
  const [selectedCity, setSelectedCityState] = useState(DEFAULT_SELECTED_CITY);
  const [cityInitDone, setCityInitDone] = useState(false);
  const [cityResolving, setCityResolving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(SELECTED_CITY_STORAGE_KEY);
    if (saved) {
      setSelectedCityState(saved);
      setCityInitDone(true);
    }
  }, []);

  const setSelectedCity = useCallback((city: string) => {
    setSelectedCityState(city);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SELECTED_CITY_STORAGE_KEY, city);
    }
  }, []);

  const value = useMemo(
    () => ({
      selectedCity,
      setSelectedCity,
      cityInitDone,
      cityResolving,
      setCityInitDone,
      setCityResolving,
    }),
    [selectedCity, setSelectedCity, cityInitDone, cityResolving],
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
