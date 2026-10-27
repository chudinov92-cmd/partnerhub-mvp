import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: __dirname,
  transpilePackages: ["@my-startup/ui", "@my-startup/hooks", "@my-startup/analytics", "@my-startup/auth", "@my-startup/chat", "@my-startup/subscription", "@my-startup/notifications", "@my-startup/profile", "@my-startup/map-ui"],
  // web-push и nodemailer — серверные пакеты (fs/net только в Node): не бандлим в клиент.
  serverExternalPackages: ["web-push", "nodemailer"],
  webpack: (config) => {
    config.resolve.modules = [
      ...(config.resolve.modules || []),
      path.resolve(__dirname, "node_modules"),
    ];
    return config;
  },
  // CSP и HSTS — в middleware (nonce per-request). Здесь только fallback для путей вне matcher.
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: "geolocation=(self), camera=(), microphone=(), payment=()",
      },
    ];
    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      { source: "/home", destination: "/", permanent: true },
      { source: "/landing", destination: "/", permanent: true },
      { source: "/about", destination: "/", permanent: true },
      { source: "/about2", destination: "/", permanent: true },
      { source: "/about3", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
