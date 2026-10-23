import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // The research dossiers (loaded into OCR system prompts) and the SQLite
  // bootstrap DDL must be readable at runtime, including on serverless hosts.
  outputFileTracingIncludes: {
    "/api/**": ["./research/**", "./db/bootstrap.sql"],
  },
};

export default nextConfig;
