import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@my-startup/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type CookieStoreLike = Pick<typeof cookies.prototype, "getAll"> &
  Partial<Pick<typeof cookies.prototype, "set">>;

/** Mutable holder — setAll пересоздаёт response по паттерну @supabase/ssr. */
export type SupabaseMiddlewareResponseHolder = {
  current: NextResponse;
  /** Заголовки запроса с x-nonce — сохраняем при refresh cookie-сессии. */
  requestHeaders: Headers;
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
          request: { headers: holder.requestHeaders },
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

// createSupabaseAdminClient — из @my-startup/auth (supabaseAdmin.ts)
