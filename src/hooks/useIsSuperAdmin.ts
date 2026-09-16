"use client";

import { useEffect, useState } from "react";
import { adminGetAdminRow, adminGetAuthUser } from "@/services/adminService";

export function useIsSuperAdmin(): {
  loading: boolean;
  isSuperAdmin: boolean;
} {
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await adminGetAuthUser();
        if (!user) {
          if (alive) setIsSuperAdmin(false);
          return;
        }
        const { data } = await adminGetAdminRow(user.id);
        if (!alive) return;
        setIsSuperAdmin((data as { role?: string } | null)?.role === "super_admin");
      } catch {
        if (alive) setIsSuperAdmin(false);
      } finally {
        if (alive) setLoading(false);
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, []);

  return { loading, isSuperAdmin };
}
