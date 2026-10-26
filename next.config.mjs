/** @type {import('next').NextConfig} */
const nextConfig = {
  // Parsers and the LLM client run only on the server; keep them out of the bundle.
  serverExternalPackages: ["exceljs", "unpdf", "jszip", "undici"],
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;
