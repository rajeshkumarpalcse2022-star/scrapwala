import type { NextConfig } from "next";
import { SOCIAL_EMBED_FRAME_ORIGINS } from "./lib/utils/social-embeds";

const BLOG_FRAME_CSP = [
  "frame-src 'self'",
  ...SOCIAL_EMBED_FRAME_ORIGINS,
].join(" ");

const nextConfig: NextConfig = {
  // pdfkit reads bundled AFM/font data via fs at runtime; keep it out of the
  // server bundle so the standard-font PDF generator works in production.
  serverExternalPackages: ["pdfkit"],

  async headers() {
    return [
      {
        source: "/blogs/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `${BLOG_FRAME_CSP};`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
