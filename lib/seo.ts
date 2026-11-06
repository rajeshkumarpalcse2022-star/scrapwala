import type { Metadata } from "next";
import {
  DEFAULT_OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
  SITE_URL,
  SOCIAL_PROFILES,
  SUPPORT_EMAIL,
  SUPPORT_PHONE_TEL,
} from "@/lib/constants/site";

export { SITE_URL };

/** Stable date for static pages that do not expose a real modified timestamp. */
export const SITE_CONTENT_UPDATED = new Date("2026-10-25T00:00:00.000Z");

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

/** Build an absolute URL for a public path. `/` resolves to the bare origin. */
export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (!path || path === "/") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

interface PageImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

interface BuildMetadataInput {
  /** Visible SEO title. The root template appends “ | Scrapi” unless absolute. */
  title: string;
  description?: string;
  /** Canonical public path, e.g. `/scrap-rates`. */
  path: string;
  /** Set true when the title already contains the brand suffix. */
  absoluteTitle?: boolean;
  image?: PageImage;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  tags?: string[];
  noIndex?: boolean;
  keywords?: string[];
}

/**
 * Single metadata builder for public pages: canonical URL, Open Graph,
 * Twitter card and robots directives stay consistent across the site.
 */
export function buildMetadata({
  title,
  description = SITE_DESCRIPTION,
  path,
  absoluteTitle = false,
  image = DEFAULT_OG_IMAGE,
  type = "website",
  publishedTime,
  modifiedTime,
  authors,
  tags,
  noIndex = false,
  keywords,
}: BuildMetadataInput): Metadata {
  const canonical = absoluteUrl(path);

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    keywords,
    alternates: { canonical },
    robots: noIndex
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      type,
      url: canonical,
      title,
      description,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      images: [{ ...image }],
      ...(type === "article"
        ? {
            publishedTime,
            modifiedTime,
            authors,
            tags,
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.url],
    },
  };
}

/** Organization schema — only verified brand details are included. */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/images/scrapi-logo.png"),
      width: 816,
      height: 306,
    },
    image: absoluteUrl(DEFAULT_OG_IMAGE.url),
    email: SUPPORT_EMAIL,
    telephone: SUPPORT_PHONE_TEL,
    sameAs: SOCIAL_PROFILES.map((profile) => profile.href),
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        telephone: SUPPORT_PHONE_TEL,
        email: SUPPORT_EMAIL,
        areaServed: "IN",
      },
    ],
  };
}

/** WebSite schema — establishes the site name and publisher relationship. */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: "en-IN",
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

/** BreadcrumbList schema matching a visible breadcrumb trail. */
export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Generic WebPage schema for public content pages. */
export function webPageJsonLd({
  name,
  description,
  path,
}: {
  name: string;
  description: string;
  path: string;
}) {
  const url = absoluteUrl(path);
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name,
    description,
    isPartOf: { "@id": WEBSITE_ID },
    inLanguage: "en-IN",
  };
}
