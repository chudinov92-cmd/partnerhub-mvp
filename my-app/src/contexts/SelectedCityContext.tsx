"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { RUSSIA_LABEL } from "@/data/cities";

type SelectedCityContextValue = {
  selectedCity: string;
  /**
   * Явный выбор города пользователем (селектор в шапке, «Открыть всю Россию»).
   * Помечает выбор как «пользовательский» — такой выбор никогда не
   * перетирается автоматическим применением города из профиля.
   */
  setSelectedCity: (city: string) => void;
  /**
   * Системное применение города из профиля (после онбординга / SIGNED_IN).
   * Действует только если пользователь ещё не выбирал город вручную.
   */
  setSelectedCityFromProfile: (city: string) => void;
  /** true, если пользователь сам выбрал город через setSelectedCity. */
  userPickedCity: boolean;
};

const SelectedCityContext = createContext<SelectedCityContextValue | null>(
  null,
);

export function SelectedCityProvider({ children }: { children: ReactNode }) {
  const [selectedCity, setSelectedCityState] = useState(() => {
    if (typeof window === "undefined") return RUSSIA_LABEL;
    return window.localStorage.getItem("selected_city") || RUSSIA_LABEL;
  });
  // Переключается в true, только когда пользователь сам выбрал город
  // через setSelectedCity (селектор в шапке / «Открыть всю Россию»).
  const [userPickedCity, setUserPickedCity] = useState(false);

  const setSelectedCity = useCallback((city: string) => {
    setSelectedCityState(city);
    setUserPickedCity(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("selected_city", city);
    }
  }, []);

  // Системное применение города из профиля (после онбординга / SIGNED_IN).
  // НЕ помечает выбор как пользовательский, поэтому последующие изменения
  // профильного города могут применяться автоматически, пока пользователь
  // не выберет город вручную.
  const setSelectedCityFromProfile = useCallback((city: string) => {
    setSelectedCityState(city);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("selected_city", city);
    }
  }, []);

  const value = useMemo(
    () => ({
      selectedCity,
      setSelectedCity,
      setSelectedCityFromProfile,
      userPickedCity,
    }),
    [selectedCity, setSelectedCity, setSelectedCityFromProfile, userPickedCity],
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
