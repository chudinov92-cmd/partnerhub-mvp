import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: __dirname,
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
