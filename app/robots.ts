import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/_next/static/", "/_next/image/", "/images/"],
        disallow: [
          "/admin",
          "/admin/",
          "/collector",
          "/collector/",
          "/api/",
          "/login",
          "/signup",
          "/pickup",
          "/pickup/",
          "/pickup-history",
          "/application-history",
          "/careers",
          "/careers/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
