import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone for Docker, auto for Vercel (Vercel uses its own build pipeline)
  output: process.env.VERCEL ? undefined : "standalone",
  reactCompiler: true,
};

export default nextConfig;
