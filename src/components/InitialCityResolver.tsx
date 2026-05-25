"use client";

import { useEffect, useRef } from "react";
import {
  DEFAULT_SELECTED_CITY,
  SELECTED_CITY_STORAGE_KEY,
  useSelectedCity,
} from "@/contexts/SelectedCityContext";
import { isZeipCity } from "@/data/cities";
import { authGetUser } from "@/services/authService";
import { fetchCurrentUserProfileRow } from "@/services/profileService";

/**
 * При первом визите (нет selected_city в localStorage):
 * профиль.city → IP-геолокация → Пермь.
 */
export function InitialCityResolver() {
  const {
    setSelectedCity,
    cityInitDone,
    setCityInitDone,
    setCityResolving,
  } = useSelectedCity();
  const startedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (cityInitDone || startedRef.current) return;

    const saved = window.localStorage.getItem(SELECTED_CITY_STORAGE_KEY);
    if (saved) {
      setCityInitDone(true);
      return;
    }

    startedRef.current = true;
    setCityResolving(true);

    void (async () => {
      let resolvedCity = DEFAULT_SELECTED_CITY;

      try {
        const { data: authData } = await authGetUser();
        const authUserId = authData.user?.id;
        if (authUserId) {
          const profile = await fetchCurrentUserProfileRow(authUserId);
          if (isZeipCity(profile?.city)) {
            resolvedCity = profile.city;
            setSelectedCity(resolvedCity);
            return;
          }
        }

        const res = await fetch("/api/geo/detect-city", {
          cache: "no-store",
        });
        if (res.ok) {
          const payload = (await res.json()) as { city?: string | null };
          if (isZeipCity(payload.city)) {
            resolvedCity = payload.city;
          }
        }
      } catch (e) {
        console.error("Initial city resolve failed", e);
      } finally {
        setSelectedCity(resolvedCity);
        setCityResolving(false);
        setCityInitDone(true);
      }
    })();
  }, [
    cityInitDone,
    setSelectedCity,
    setCityInitDone,
    setCityResolving,
  ]);

  return null;
}
