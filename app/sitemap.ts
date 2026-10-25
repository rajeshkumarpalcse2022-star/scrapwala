import type { MetadataRoute } from "next";
import { listPublishedPosts } from "@/services/blog";

// Refresh at least hourly; admin mutations also purge /sitemap.xml directly.
export const revalidate = 3600;

/**
 * Static public routes + every published blog article (DB-driven).
 * Falls back to static routes only when the database is unreachable.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://scrapi.in";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/scrap-categories`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/scrap-rates`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/how-it-works`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/blogs`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/cancellation-refund`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const blogRoutes: MetadataRoute.Sitemap = [];

  try {
    // 24 per page is the service max; cap at 20 pages (480 articles).
    let page = 1;
    let totalPages = 1;
    do {
      const result = await listPublishedPosts({ page, limit: 24 });
      totalPages = result.totalPages;
      for (const post of result.posts) {
        blogRoutes.push({
          url: `${baseUrl}/blogs/${post.slug}`,
          lastModified: new Date(post.publishedAt),
          changeFrequency: "monthly",
          priority: 0.6,
        });
      }
      page += 1;
    } while (page <= totalPages && page <= 20);
  } catch {
    // Database unavailable — still emit the static routes.
  }

  return [...staticRoutes, ...blogRoutes];
}
