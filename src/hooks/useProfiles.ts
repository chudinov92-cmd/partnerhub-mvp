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

/** Загрузка справочников для фильтров карты, онбординга и профиля. */
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
  const [catalogsLoading, setCatalogsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setCatalogsLoading(true);

    Promise.all([
      loadProfessionCatalog(),
      loadIndustryCatalog(),
      loadSubindustryCatalog(),
    ])
      .then(([profRows, indRows, subRows]) => {
        if (!alive) return;
        setProfessionCatalog(profRows);
        setIndustryCatalog(indRows);
        setSubindustryCatalog(subRows);
      })
      .catch((e) => {
        console.error("[useProfiles] failed to load catalogs", e);
        if (!alive) return;
        setProfessionCatalog([]);
        setIndustryCatalog([]);
        setSubindustryCatalog([]);
      })
      .finally(() => {
        if (alive) setCatalogsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  return {
    professionCatalog,
    industryCatalog,
    subindustryCatalog,
    catalogsLoading,
    setProfessionCatalog,
    setIndustryCatalog,
    setSubindustryCatalog,
  };
}
