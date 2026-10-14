import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Fotos de armazones (se comprimen en el navegador antes de enviarse)
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
