/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output (for Docker/ECS) creates node_modules symlinks under
  // .next/standalone, which break `next dev` on OneDrive/Windows. Enable it only
  // in the container build via BUILD_STANDALONE=1 (set in the Dockerfile).
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" } : {}),
  experimental: {
    // pdf-parse / mammoth are CommonJS libs used only in server code
    serverComponentsExternalPackages: ["pdf-parse", "mammoth"],
  },
};

export default nextConfig;
