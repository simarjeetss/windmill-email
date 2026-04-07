import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // File uploads in Server Actions need a little headroom above our 10 MB app limit.
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
