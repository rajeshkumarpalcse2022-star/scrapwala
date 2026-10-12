import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit reads bundled AFM/font data via fs at runtime; keep it out of the
  // server bundle so the standard-font PDF generator works in production.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
