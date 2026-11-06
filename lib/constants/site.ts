/** Canonical public origin — used for canonical URLs, sitemap and social meta. */
export const SITE_URL = "https://scrapi.in";

/** Public brand / business details used in metadata and structured data. */
export const SITE_NAME = "Scrapi";
export const SITE_DESCRIPTION =
  "Sell your scrap online with Scrapi. Request convenient doorstep scrap pickup, get your materials weighed, and connect with our scrap collection team.";
export const SITE_LOCALE = "en_IN";

/** Real Scrapi social profiles (also used for Organization sameAs). */
export const SOCIAL_PROFILES = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/scrapi-in-522494448/",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/scrapi.in/",
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61595829340693",
  },
] as const;

/** Default social sharing image (1200×630, generated brand asset). */
export const DEFAULT_OG_IMAGE = {
  url: "/images/scrapi-og.png",
  width: 1200,
  height: 630,
  alt: "Scrapi — doorstep scrap pickup and recycling in India",
} as const;

/** Public support contact channels (WhatsApp wa.me format digits only). */
export const SUPPORT_EMAIL = "hello@scrapi.in";
export const SUPPORT_WHATSAPP_NUMBER = "918348977500";
export const SUPPORT_WHATSAPP_DISPLAY = "+91 83489 77500";
export const SUPPORT_PHONE_TEL = "+918348977500";
export const SUPPORT_PHONE_DISPLAY = "+91 83489 77500";

export function getWhatsAppLink(): string {
  return `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`;
}
