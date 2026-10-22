/**
 * Structured blog article content.
 *
 * Articles are stored as a typed block list (never raw HTML), so the public
 * renderer can emit semantic React elements without dangerouslySetInnerHTML.
 * Inline emphasis/links use a small, safe markup (`**bold**`, `*italic*`,
 * `[label](https://…)`) that is tokenised client/server side into typed
 * nodes — unknown or malformed markup degrades to literal text.
 */

export type HeadingLevel = 2 | 3 | 4;

export interface BlogImageBlock {
  type: "image";
  url: string;
  publicId?: string;
  alt: string;
  caption?: string;
}

export type BlogBlock =
  | { type: "heading"; level: HeadingLevel; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bulletList"; items: string[] }
  | { type: "orderedList"; items: string[] }
  | { type: "blockquote"; text: string }
  | BlogImageBlock;

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "strong"; children: InlineNode[] }
  | { type: "em"; children: InlineNode[] }
  | { type: "a"; href: string; children: InlineNode[] };

/* ── Plain text / reading time ─────────────────────────────────────────── */

function collectText(value: string, out: string[]): void {
  const trimmed = value.trim();
  if (trimmed) out.push(trimmed);
}

/** Plain searchable text of an article (blocks are typed, input is guarded). */
export function extractPlainText(content: unknown): string {
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];

  for (const raw of content) {
    if (!raw || typeof raw !== "object") continue;
    const block = raw as Partial<BlogBlock>;

    switch (block.type) {
      case "heading":
      case "paragraph":
      case "blockquote":
        if (typeof block.text === "string") collectText(block.text, parts);
        break;
      case "bulletList":
      case "orderedList":
        if (Array.isArray(block.items)) {
          for (const item of block.items) {
            if (typeof item === "string") collectText(item, parts);
          }
        }
        break;
      case "image":
        if (typeof block.alt === "string") collectText(block.alt, parts);
        if (typeof block.caption === "string") collectText(block.caption, parts);
        break;
      default:
        break;
    }
  }

  return parts.join(" ");
}

export function countWords(text: string): number {
  const matches = text.match(/[\p{L}\p{N}'’-]+/gu);
  return matches ? matches.length : 0;
}

/** Reading time from the real article text (≈220 wpm, minimum 1 minute). */
export function calculateReadingTimeMinutes(content: unknown): number {
  const words = countWords(extractPlainText(content));
  if (words === 0) return 1;
  return Math.max(1, Math.round(words / 220));
}

/* ── Safe inline markup ────────────────────────────────────────────────── */

const MAX_INLINE_DEPTH = 6;

const SAFE_HREF = /^(https?:\/\/|mailto:)[^\s<>"']+$/i;

/** Only http(s) and mailto links survive; everything else is rejected. */
export function sanitizeHref(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed || trimmed.length > 2000) return null;
  // Reject control characters and protocol tricks like "jav\tascript:".
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return null;
  if (!SAFE_HREF.test(trimmed)) return null;
  if (!/^https?:\/\//i.test(trimmed) && !/^mailto:/i.test(trimmed)) return null;
  return trimmed;
}

function parseInner(input: string, depth: number): InlineNode[] {
  if (depth > MAX_INLINE_DEPTH) {
    return [{ type: "text", value: input }];
  }

  const nodes: InlineNode[] = [];
  let index = 0;
  let plainStart = 0;

  const pushPlain = (end: number) => {
    if (end > plainStart) {
      nodes.push({ type: "text", value: input.slice(plainStart, end) });
    }
  };

  while (index < input.length) {
    if (input.startsWith("**", index)) {
      const closing = input.indexOf("**", index + 2);
      if (closing > index + 1) {
        const inner = input.slice(index + 2, closing);
        pushPlain(index);
        nodes.push({
          type: "strong",
          children: parseInner(inner, depth + 1),
        });
        index = closing + 2;
        plainStart = index;
        continue;
      }
    }

    if (input[index] === "*" && input[index + 1] !== "*") {
      const closing = input.indexOf("*", index + 1);
      if (closing > index) {
        const inner = input.slice(index + 1, closing);
        if (inner.trim().length > 0) {
          pushPlain(index);
          nodes.push({ type: "em", children: parseInner(inner, depth + 1) });
          index = closing + 1;
          plainStart = index;
          continue;
        }
      }
    }

    if (input[index] === "[") {
      const closingBracket = input.indexOf("]", index + 1);
      if (
        closingBracket > index &&
        input[closingBracket + 1] === "(" &&
        input.indexOf(")", closingBracket + 2) > closingBracket + 1
      ) {
        const label = input.slice(index + 1, closingBracket);
        const hrefEnd = input.indexOf(")", closingBracket + 2);
        const rawHref = input.slice(closingBracket + 2, hrefEnd);
        const href = sanitizeHref(rawHref);
        if (href && label.length > 0) {
          pushPlain(index);
          nodes.push({
            type: "a",
            href,
            children: parseInner(label, depth + 1),
          });
          index = hrefEnd + 1;
          plainStart = index;
          continue;
        }
      }
    }

    index += 1;
  }

  pushPlain(input.length);
  return nodes;
}

/**
 * Tokenise inline markup into typed nodes. Never produces HTML, so callers
 * can render the result as plain React children with no escaping concerns.
 */
export function parseInlineText(input: string): InlineNode[] {
  if (typeof input !== "string" || input.length === 0) return [];
  return parseInner(input, 0);
}

/* ── Editors helpers ───────────────────────────────────────────────────── */

/** Plain-text preview of a block, used for list headers and empty checks. */
export function blockPreview(block: BlogBlock): string {
  switch (block.type) {
    case "heading":
      return block.text;
    case "paragraph":
      return block.text;
    case "blockquote":
      return block.text;
    case "bulletList":
    case "orderedList":
      return block.items[0] ?? "";
    case "image":
      return block.caption || block.alt || "Image";
    default:
      return "";
  }
}

export function isEmptyContent(content: unknown): boolean {
  if (!Array.isArray(content)) return true;
  return content.every((block) => {
    if (!block || typeof block !== "object") return true;
    const candidate = block as { type?: string; text?: unknown; items?: unknown };
    if (candidate.type === "bulletList" || candidate.type === "orderedList") {
      return !Array.isArray(candidate.items) || candidate.items.length === 0;
    }
    if (candidate.type === "image") return false;
    if (typeof candidate.text === "string") return candidate.text.trim() === "";
    return true;
  });
}
