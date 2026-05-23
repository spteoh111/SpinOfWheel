import type { NextConfig } from "next";

const BUILD_ID = String(Date.now());

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  generateBuildId: async () => BUILD_ID,
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
