"use client";

import { useEffect, useState } from "react";
import { adminGetAdminRow, adminGetAuthUser } from "@/services/adminService";

let cachedIsSuperAdmin: boolean | null = null;
let resolveSuperAdminPromise: Promise<boolean> | null = null;

async function resolveSuperAdminOnce(): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await adminGetAuthUser();
    if (!user) return false;
    const { data } = await adminGetAdminRow(user.id);
    return (data as { role?: string } | null)?.role === "super_admin";
  } catch {
    return false;
  }
}

export function useIsSuperAdmin(): {
  loading: boolean;
  isSuperAdmin: boolean;
} {
  const [loading, setLoading] = useState(cachedIsSuperAdmin === null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(cachedIsSuperAdmin ?? false);

  useEffect(() => {
    if (cachedIsSuperAdmin !== null) {
      setIsSuperAdmin(cachedIsSuperAdmin);
      setLoading(false);
      return;
    }

    if (!resolveSuperAdminPromise) {
      resolveSuperAdminPromise = resolveSuperAdminOnce().then((value) => {
        cachedIsSuperAdmin = value;
        return value;
      });
    }

    let alive = true;
    void resolveSuperAdminPromise.then((value) => {
      if (!alive) return;
      setIsSuperAdmin(value);
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, []);

  return { loading, isSuperAdmin };
}
