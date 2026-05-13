"use client";

import { useEffect, useState } from "react";
import {
  loadIndustryCatalog,
  loadSubindustryCatalog,
  type IndustryCatalogRow,
  type SubindustryCatalogRow,
} from "@/lib/industryCatalog";
import {
  loadProfessionCatalog,
  type ProfessionCatalogRow,
} from "@/lib/professionCatalog";

/** Загрузка справочников для фильтров карты и ленты. */
export function useProfiles() {
  const [professionCatalog, setProfessionCatalog] = useState<
    ProfessionCatalogRow[]
  >([]);
  const [industryCatalog, setIndustryCatalog] = useState<IndustryCatalogRow[]>(
    [],
  );
  const [subindustryCatalog, setSubindustryCatalog] = useState<
    SubindustryCatalogRow[]
  >([]);

  useEffect(() => {
    let alive = true;
    loadProfessionCatalog()
      .then((rows) => {
        if (!alive) return;
        setProfessionCatalog(rows);
      })
      .catch(() => {
        //
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    loadIndustryCatalog()
      .then((rows) => {
        if (!alive) return;
        setIndustryCatalog(rows);
      })
      .catch((e) => {
        console.error("Failed to load industry_catalog", e);
      });
    loadSubindustryCatalog()
      .then((rows) => {
        if (!alive) return;
        setSubindustryCatalog(rows);
      })
      .catch((e) => {
        console.error("Failed to load subindustry_catalog", e);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { professionCatalog, industryCatalog, subindustryCatalog };
}
