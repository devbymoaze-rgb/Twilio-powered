import type { NextConfig } from "next";

if (process.env.RAILWAY_ENVIRONMENT && !process.env.NEXT_PUBLIC_API_URL) {
  throw new Error(
    "Set NEXT_PUBLIC_API_URL to your public API origin (https://your-api.up.railway.app) before building."
  );
}

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
