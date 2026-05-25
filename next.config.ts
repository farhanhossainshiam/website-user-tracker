import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "womist.pro" },
      { protocol: "https", hostname: "dinka.shop" },
      { protocol: "https", hostname: "womist.shop" },
    ],
  },
};

export default nextConfig;
