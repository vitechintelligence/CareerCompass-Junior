import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          destination: "/international",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
