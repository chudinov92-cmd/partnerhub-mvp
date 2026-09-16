import type { NextResponse } from "next/server";
import {
  RECOVERY_REDIRECT_SCRIPT_INLINE,
  SCHEMA_ORG_JSON_LD,
} from "@/lib/inlineScripts";

/** Дублируем nonce в x-nonce для layout; Next.js берёт nonce из request CSP. */
export const CSP_NONCE_HEADER = "x-nonce";

const SCRIPT_SRC_HOSTS = [
  "https://mc.yandex.ru",
  "https://mc.yandex.com",
  "https://mc.webvisor.org",
  "https://mc.webvisor.com",
  "https://top-fwz1.mail.ru",
  "https://www.googletagmanager.com",
] as const;

const ANALYTICS_IMG_HOSTS = [
  "https://mc.yandex.ru",
  "https://mc.yandex.com",
  "https://top-fwz1.mail.ru",
  "https://www.google-analytics.com",
  "https://www.googletagmanager.com",
] as const;

const MAPS_HOSTS = [
  "https://maps.vk.com",
  "https://tiles.maps.vk.com",
  "https://events.maps.vk.com",
] as const;

const WEBVISOR_FRAME_HOSTS = [
  "https://mc.yandex.ru",
  "https://mc.yandex.com",
  "https://mc.webvisor.org",
  "https://mc.webvisor.com",
] as const;

/** Precomputed sha256-base64 для фиксированных inline-скриптов (Edge-safe). */
export const INLINE_SCRIPT_HASHES = [
  "sha256-XJrFS6YKGk2HubX+Wtw47mqFo2OafKmUDuRLKY0AUkE=",
  "sha256-t1xYD4CQ66QSrESTzw/XbGwVm2Gq2EAwi09qRpoo/so=",
] as const;

export type SecurityHeadersOptions = {
  reportOnly?: boolean;
};

function getSupabaseOrigins(): string[] {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) return [];

  try {
    const parsed = new URL(url);
    const httpOrigin = parsed.origin;
    const wsOrigin =
      parsed.protocol === "https:"
        ? `wss://${parsed.host}`
        : `ws://${parsed.host}`;
    return [httpOrigin, wsOrigin];
  } catch {
    return [];
  }
}

function joinDirective(name: string, values: string[]): string {
  return `${name} ${values.join(" ")}`;
}

export function generateCspNonce(): string {
  return btoa(crypto.randomUUID());
}

export function buildCspHeader(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const supabaseOrigins = getSupabaseOrigins();

  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    "'unsafe-inline'",
    ...INLINE_SCRIPT_HASHES,
    "blob:",
    ...SCRIPT_SRC_HOSTS,
  ];
  if (isDev) {
    scriptSrc.push("'unsafe-eval'");
  }

  const connectSrc = [
    "'self'",
    ...supabaseOrigins,
    ...MAPS_HOSTS,
    ...SCRIPT_SRC_HOSTS,
    "https://www.google-analytics.com",
    "https://region1.google-analytics.com",
  ];

  const imgSrc = [
    "'self'",
    "data:",
    "blob:",
    ...ANALYTICS_IMG_HOSTS,
    ...MAPS_HOSTS,
  ];

  const directives = [
    joinDirective("default-src", ["'self'"]),
    joinDirective("script-src", scriptSrc),
    joinDirective("style-src", ["'self'", "'unsafe-inline'"]),
    joinDirective("img-src", imgSrc),
    joinDirective("connect-src", connectSrc),
    joinDirective("font-src", ["'self'", "data:"]),
    joinDirective("worker-src", ["'self'", "blob:"]),
    joinDirective("child-src", ["'self'", "blob:"]),
    joinDirective("media-src", ["'self'", "blob:"]),
    joinDirective("frame-src", ["'self'", ...WEBVISOR_FRAME_HOSTS]),
    joinDirective("form-action", ["'self'", "https://auth.robokassa.ru"]),
    joinDirective("base-uri", ["'self'"]),
    joinDirective("object-src", ["'none'"]),
    joinDirective("frame-ancestors", ["'none'"]),
  ];

  if (!isDev) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export function isCspReportOnly(): boolean {
  return process.env.CSP_REPORT_ONLY === "1";
}

export function cspHeaderName(reportOnly?: boolean): string {
  return (reportOnly ?? isCspReportOnly())
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";
}

/**
 * CSP на request, не только на response: Next.js читает nonce из
 * Content-Security-Policy входящего запроса и ставит его на <script>.
 * Одного x-nonce недостаточно.
 */
export function applyCspToRequestHeaders(
  requestHeaders: Headers,
  nonce: string,
  options: SecurityHeadersOptions = {},
): void {
  const csp = buildCspHeader(nonce);
  requestHeaders.set(CSP_NONCE_HEADER, nonce);
  requestHeaders.set(cspHeaderName(options.reportOnly), csp);
}

export function applySecurityHeaders(
  response: NextResponse,
  nonce: string,
  options: SecurityHeadersOptions = {},
): NextResponse {
  const csp = buildCspHeader(nonce);
  const headerName = cspHeaderName(options.reportOnly);

  response.headers.set(headerName, csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(self), camera=(), microphone=(), payment=()",
  );

  // На VPS Caddy → Next по http://127.0.0.1 — HSTS по NODE_ENV, не по request.protocol.
  if (
    process.env.NODE_ENV === "production" &&
    process.env.CSP_DISABLE_HSTS !== "1"
  ) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  return response;
}

/** Edge/WebCrypto sha256-base64 для проверки INLINE_SCRIPT_HASHES в тестах. */
export async function sha256ScriptHash(source: string): Promise<string> {
  const data = new TextEncoder().encode(source);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return `sha256-${base64}`;
}

/** Источники inline-скриптов для unit-тестов хешей. */
export const INLINE_SCRIPT_SOURCES = [
  RECOVERY_REDIRECT_SCRIPT_INLINE,
  SCHEMA_ORG_JSON_LD,
] as const;
