import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  experimental: {
    // These settings are critical for low-memory environments (1GB RAM)
    // Limits build to 1 CPU core to prevent OOM kills
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;
