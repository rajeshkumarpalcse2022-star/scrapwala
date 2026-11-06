import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants/site";
import { SITE_CONTENT_UPDATED } from "@/lib/seo";
import { listPublishedPosts } from "@/services/blog";

// Refresh at least hourly; admin mutations also purge /sitemap.xml directly.
export const revalidate = 3600;

/**
 * Canonical public routes + every eligible published blog article (DB-driven).
 * Admin, collector, auth, booking and private account pages are intentionally
 * excluded, as are drafts, scheduled (not yet due) and archived articles.
 * Falls back to static routes only when the database is unreachable.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: SITE_CONTENT_UPDATED,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: SITE_CONTENT_UPDATED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/scrap-categories`,
      lastModified: SITE_CONTENT_UPDATED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/scrap-rates`,
      lastModified: SITE_CONTENT_UPDATED,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/how-it-works`,
      lastModified: SITE_CONTENT_UPDATED,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: SITE_CONTENT_UPDATED,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/blogs`,
      lastModified: SITE_CONTENT_UPDATED,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/privacy-policy`,
      lastModified: SITE_CONTENT_UPDATED,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: SITE_CONTENT_UPDATED,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/cancellation-refund`,
      lastModified: SITE_CONTENT_UPDATED,
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
          url: `${SITE_URL}/blogs/${post.slug}`,
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
