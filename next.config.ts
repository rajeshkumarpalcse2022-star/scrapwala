import type { NextConfig } from "next";
import { SOCIAL_EMBED_FRAME_ORIGINS } from "./lib/utils/social-embeds";
import { SITE_URL } from "./lib/constants/site";

const BLOG_FRAME_CSP = [
  "frame-src 'self'",
  ...SOCIAL_EMBED_FRAME_ORIGINS,
].join(" ");

const NOINDEX_HEADER = {
  key: "X-Robots-Tag",
  value: "noindex, nofollow",
};

const PRIVATE_ROUTE_HEADERS = [
  "/admin/:path*",
  "/collector/:path*",
  "/api/:path*",
  "/login",
  "/signup",
  "/pickup",
  "/pickup/:path*",
  "/pickup-history",
  "/application-history",
  "/careers",
  "/careers/:path*",
].map((source) => ({
  source,
  headers: [NOINDEX_HEADER],
}));

const nextConfig: NextConfig = {
  poweredByHeader: false,

  // pdfkit reads bundled AFM/font data via fs at runtime; keep it out of the
  // server bundle so the standard-font PDF generator works in production.
  serverExternalPackages: ["pdfkit"],

  async redirects() {
    return [
      // One canonical host: www → apex (permanent, no chains).
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.scrapi.in" }],
        destination: `${SITE_URL}/:path*`,
        permanent: true,
      },
    ];
  },

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
      ...PRIVATE_ROUTE_HEADERS,
    ];
  },
};

export default nextConfig;
