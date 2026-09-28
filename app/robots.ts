import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/collector", "/dashboard"],
      },
    ],
    sitemap: "https://scrapwala.example/sitemap.xml",
  };
}
