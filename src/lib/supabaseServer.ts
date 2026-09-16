import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest, NextResponse } from "next/server";
import type { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export type CookieStoreLike = Pick<typeof cookies.prototype, "getAll"> &
  Partial<Pick<typeof cookies.prototype, "set">>;

/** Mutable holder — setAll пересоздаёт response по паттерну @supabase/ssr. */
export type SupabaseMiddlewareResponseHolder = {
  current: NextResponse;
};

/** Supabase в middleware: чтение request.cookies, запись в request + response. */
export function createSupabaseMiddlewareClient(
  request: NextRequest,
  holder: SupabaseMiddlewareResponseHolder,
) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet: { name: string; value: string; options?: CookieOptions }[]) {
        toSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        holder.current = NextResponse.next({
          request: { headers: request.headers },
        });
        toSet.forEach(({ name, value, options }) => {
          holder.current.cookies.set(name, value, options);
        });
      },
    },
  });
}

/** Route Handlers / Server Actions — `const store = await cookies()`. */
export function createSupabaseRouteClient(
  cookieStoreOrAdapter: CookieStoreLike,
  opts?: {
    wrapResponseCookies?: NextResponse | null;
  },
) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        try {
          return cookieStoreOrAdapter.getAll();
        } catch {
          return [];
        }
      },
      setAll(toSet: { name: string; value: string; options?: CookieOptions }[]) {
        const resp = opts?.wrapResponseCookies;
        for (const c of toSet) {
          if (cookieStoreOrAdapter.set) {
            try {
              cookieStoreOrAdapter.set(c.name, c.value, c.options);
            } catch {
              //
            }
          }
          resp?.cookies.set(c.name, c.value, c.options);
        }
      },
    },
  });
}

/** После JWT-проверки — только сервер-side, ни в браузере. */
export function createSupabaseAdminClient() {
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY не задан");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
