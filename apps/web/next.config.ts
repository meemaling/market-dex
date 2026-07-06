import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@market-dex/pokemon-price-tracker"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "tcgplayer-cdn.tcgplayer.com",
      },
    ],
  },
};

export default nextConfig;
