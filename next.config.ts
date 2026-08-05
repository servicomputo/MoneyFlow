import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Excluir paquetes que solo funcionan en el navegador del bundle de servidor
  serverExternalPackages: ["dexie"],
};

export default nextConfig;
