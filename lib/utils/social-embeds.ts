/**
 * Allow-listed social embeds.
 *
 * Only a small set of providers can become an iframe. The stored `embedUrl`
 * is never trusted on render: the public page recomputes it from the original
 * post URL, so malformed or tampered data cannot inject an arbitrary frame.
 */

export type SocialEmbedProvider =
  | "youtube"
  | "facebook"
  | "instagram"
  | "vimeo";

export interface ParsedSocialEmbed {
  provider: SocialEmbedProvider;
  /** Canonical https URL of the original post/video. */
  url: string;
  /** Provider-owned iframe URL derived from `url`. */
  embedUrl: string;
}

export const SOCIAL_EMBED_PROVIDERS = [
  "youtube",
  "facebook",
  "instagram",
  "vimeo",
] as const satisfies readonly SocialEmbedProvider[];

export const SOCIAL_EMBED_PROVIDER_LABELS: Record<SocialEmbedProvider, string> = {
  youtube: "YouTube",
  facebook: "Facebook",
  instagram: "Instagram",
  vimeo: "Vimeo",
};

/** Only these origins may appear in a blog embed iframe. */
export const SOCIAL_EMBED_FRAME_ORIGINS = [
  "https://www.youtube.com",
  "https://www.youtube-nocookie.com",
  "https://www.facebook.com",
  "https://web.facebook.com",
  "https://www.instagram.com",
  "https://player.vimeo.com",
] as const;

const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/;
const VIMEO_ID = /^\d{5,12}$/;
const INSTAGRAM_CODE = /^[A-Za-z0-9_-]{5,30}$/;

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
}

function toHttpUrl(input: string): URL | null {
  const raw = input.trim();
  if (!raw || raw.length > 2048) return null;
  if (/[\u0000-\u001f\u007f]/.test(raw)) return null;

  let candidate = raw;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function parseYouTube(url: URL): ParsedSocialEmbed | null {
  const host = normalizeHost(url.hostname);
  if (
    host !== "youtube.com" &&
    host !== "youtu.be" &&
    host !== "youtube-nocookie.com"
  ) {
    return null;
  }

  let id = "";
  if (host === "youtu.be") {
    id = url.pathname.split("/").filter(Boolean)[0] ?? "";
  } else if (url.pathname === "/watch") {
    id = url.searchParams.get("v") ?? "";
  } else {
    const match = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/);
    id = match?.[1] ?? "";
  }

  if (!YOUTUBE_ID.test(id)) return null;

  return {
    provider: "youtube",
    url: `https://www.youtube.com/watch?v=${id}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
  };
}

function parseVimeo(url: URL): ParsedSocialEmbed | null {
  const host = normalizeHost(url.hostname);
  if (host !== "vimeo.com" && host !== "player.vimeo.com") return null;

  const match =
    host === "player.vimeo.com"
      ? url.pathname.match(/^\/video\/(\d+)/)
      : url.pathname.match(/^\/(\d+)/);
  const id = match?.[1] ?? "";
  if (!VIMEO_ID.test(id)) return null;

  return {
    provider: "vimeo",
    url: `https://vimeo.com/${id}`,
    embedUrl: `https://player.vimeo.com/video/${id}`,
  };
}

function parseInstagram(url: URL): ParsedSocialEmbed | null {
  const host = normalizeHost(url.hostname);
  if (host !== "instagram.com") return null;

  const match = url.pathname.match(/^\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  if (!match) return null;

  const kind = match[1] === "reels" ? "reel" : match[1];
  const code = match[2];
  if (!INSTAGRAM_CODE.test(code)) return null;

  const canonical = `https://www.instagram.com/${kind}/${code}/`;
  return {
    provider: "instagram",
    url: canonical,
    embedUrl: `${canonical}embed/`,
  };
}

function isFacebookHost(host: string): boolean {
  return (
    host === "facebook.com" ||
    host === "fb.watch" ||
    host === "fb.com" ||
    host === "web.facebook.com" ||
    host === "mbasic.facebook.com"
  );
}

function parseFacebook(url: URL): ParsedSocialEmbed | null {
  const host = normalizeHost(url.hostname);
  if (!isFacebookHost(host)) return null;

  let target = url;
  let isVideo = host === "fb.watch" || host === "fb.com";
  const pluginPath = url.pathname;
  if (pluginPath.startsWith("/plugins/")) {
    const inner = url.searchParams.get("href");
    if (!inner) return null;
    const parsedInner = toHttpUrl(inner);
    if (!parsedInner) return null;
    const innerHost = normalizeHost(parsedInner.hostname);
    if (!isFacebookHost(innerHost)) return null;
    target = parsedInner;
    isVideo = pluginPath.startsWith("/plugins/video");
  }

  target.protocol = "https:";
  isVideo =
    isVideo ||
    /\/(?:videos?|reel|watch)(?:\/|$)/i.test(target.pathname) ||
    target.pathname === "/watch";

  const canonical = target.toString();
  const params = new URLSearchParams({ href: canonical, width: "500" });
  if (!isVideo) params.set("show_text", "true");

  return {
    provider: "facebook",
    url: canonical,
    embedUrl: `https://www.facebook.com/plugins/${
      isVideo ? "video.php" : "post.php"
    }?${params.toString()}`,
  };
}

/**
 * Detect and canonicalise a supported social post/video URL.
 * Returns null for anything outside the allow-list.
 */
export function parseSocialEmbed(input: unknown): ParsedSocialEmbed | null {
  if (typeof input !== "string") return null;
  const url = toHttpUrl(input);
  if (!url) return null;

  return (
    parseYouTube(url) ||
    parseVimeo(url) ||
    parseInstagram(url) ||
    parseFacebook(url)
  );
}

/** True when the URL can be rendered as an allow-listed iframe. */
export function isSocialEmbedUrl(input: unknown): boolean {
  return parseSocialEmbed(input) !== null;
}
