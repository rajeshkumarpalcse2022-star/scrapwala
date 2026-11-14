import type { AdminBlogDetailDTO } from "@/services/blog";
import type { BlogPostStatus } from "@/models/BlogPost";
import {
  extractPlainText,
  sanitizeHref,
  type BlogBlock,
  type TextAlign,
} from "@/lib/utils/blog-content";
import { parseSocialEmbed } from "@/lib/utils/social-embeds";

export type BlogStatus = BlogPostStatus;
export type ImageFieldKey = "cover" | "social";

export interface ImageValue {
  url: string;
  publicId?: string;
  alt: string;
}

export interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  bulletList: boolean;
  orderedList: boolean;
  quote: boolean;
  left: boolean;
  center: boolean;
  right: boolean;
  block: string;
}

export const EMPTY_IMAGE: ImageValue = { url: "", alt: "" };

export const EMPTY_FORMAT_STATE: FormatState = {
  bold: false,
  italic: false,
  underline: false,
  bulletList: false,
  orderedList: false,
  quote: false,
  left: false,
  center: false,
  right: false,
  block: "",
};

export const STATUS_LABELS: Record<BlogStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Unpublished",
};

export function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function imageValueFromDTO(
  image: AdminBlogDetailDTO["coverImage"] | undefined
): ImageValue {
  return image
    ? { url: image.url, publicId: image.publicId, alt: image.alt }
    : { ...EMPTY_IMAGE };
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function deriveExcerpt(blocks: BlogBlock[], title: string): string {
  const text = extractPlainText(blocks).replace(/\s+/g, " ").trim();
  if (text.length >= 10) {
    const clipped = text.slice(0, 240);
    return clipped.replace(/\s+\S*$/, "").trim();
  }
  return title.trim().slice(0, 240);
}

function alignValue(align?: TextAlign): TextAlign | undefined {
  return align === "left" ||
    align === "center" ||
    align === "right" ||
    align === "justify"
    ? align
    : undefined;
}

/** Drop empty blocks and rebuild embeds/links from their canonical URLs. */
export function cleanBlocks(input: BlogBlock[]): BlogBlock[] {
  const cleaned: BlogBlock[] = [];

  for (const block of input) {
    switch (block.type) {
      case "heading": {
        const text = block.text.trim();
        const align = alignValue(block.align);
        if (text) {
          cleaned.push({
            type: "heading",
            level: block.level,
            text,
            ...(align ? { align } : {}),
          });
        }
        break;
      }
      case "paragraph": {
        const text = block.text.trim();
        const align = alignValue(block.align);
        if (text) {
          cleaned.push({
            type: "paragraph",
            text,
            ...(align ? { align } : {}),
          });
        }
        break;
      }
      case "bulletList":
      case "orderedList": {
        const items = block.items.map((item) => item.trim()).filter(Boolean);
        const align = alignValue(block.align);
        if (items.length > 0) {
          cleaned.push({
            type: block.type,
            items,
            ...(align ? { align } : {}),
          });
        }
        break;
      }
      case "blockquote": {
        const text = block.text.trim();
        const align = alignValue(block.align);
        if (text) {
          cleaned.push({
            type: "blockquote",
            text,
            ...(align ? { align } : {}),
          });
        }
        break;
      }
      case "image": {
        const url = sanitizeHref(block.url);
        if (url && /^https?:\/\//i.test(url)) {
          const caption = block.caption?.trim();
          cleaned.push({
            type: "image",
            url,
            ...(block.publicId ? { publicId: block.publicId } : {}),
            alt: block.alt.trim(),
            ...(caption ? { caption } : {}),
          });
        }
        break;
      }
      case "embed": {
        const parsed = parseSocialEmbed(block.url);
        if (parsed) {
          const title = block.title?.trim();
          cleaned.push({
            type: "embed",
            provider: parsed.provider,
            url: parsed.url,
            embedUrl: parsed.embedUrl,
            ...(title ? { title } : {}),
          });
        }
        break;
      }
      case "link": {
        const url = sanitizeHref(block.url);
        if (url && /^https?:\/\//i.test(url)) {
          const title = block.title.trim() || hostnameOf(url);
          const description = block.description?.trim();
          cleaned.push({
            type: "link",
            url,
            title,
            ...(description ? { description } : {}),
          });
        }
        break;
      }
    }
  }

  return cleaned;
}

export function formatStateEqual(a: FormatState, b: FormatState): boolean {
  return (Object.keys(a) as (keyof FormatState)[]).every(
    (key) => a[key] === b[key]
  );
}

export function placeCaretAtEnd(element: HTMLElement): void {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = window.getSelection();
  if (!selection) return;
  selection.removeAllRanges();
  selection.addRange(range);
}
