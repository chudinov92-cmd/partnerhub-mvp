import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      { source: "/home", destination: "/about", permanent: true },
    ];
  },
};

export default nextConfig;
