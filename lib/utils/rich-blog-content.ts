import {
  parseInlineText,
  sanitizeHref,
  type BlogBlock,
  type InlineNode,
  type TextAlign,
} from "./blog-content";
import {
  parseSocialEmbed,
  SOCIAL_EMBED_PROVIDER_LABELS,
} from "./social-embeds";

/**
 * Converts between the typed block model and the small HTML used inside the
 * contenteditable article body. The editor never submits HTML: `editorRootToBlocks`
 * reads the DOM and rebuilds safe, typed blocks, while `blocksToEditorHtml`
 * initialises the editor from already-validated blocks.
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value.replace(/\r?\n/g, " "));
}

/** Escape characters that would otherwise become inline markup again. */
export function escapeInlineMarkup(value: string): string {
  return value.replace(/([\\*_\[\]])/g, "\\$1");
}

function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const sanitized = sanitizeHref(value);
  if (!sanitized || !/^https?:\/\//i.test(sanitized)) return null;
  return sanitized;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\u00a0/g, " ");
}

function inlineNodeToHtml(node: InlineNode): string {
  switch (node.type) {
    case "text":
      return escapeHtml(node.value);
    case "strong":
      return `<strong>${node.children.map(inlineNodeToHtml).join("")}</strong>`;
    case "em":
      return `<em>${node.children.map(inlineNodeToHtml).join("")}</em>`;
    case "underline":
      return `<u>${node.children.map(inlineNodeToHtml).join("")}</u>`;
    case "a": {
      const href = sanitizeHref(node.href);
      const children = node.children.map(inlineNodeToHtml).join("");
      if (!href) return children;
      return `<a href="${escapeAttribute(href)}" target="_blank" rel="noopener noreferrer">${children}</a>`;
    }
    default:
      return "";
  }
}

function inlineMarkupToHtml(markup: string): string {
  return parseInlineText(markup).map(inlineNodeToHtml).join("");
}

function wrapMarkup(marker: string, inner: string): string {
  const match = inner.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!match || !match[2]) return inner;
  return `${match[1]}${marker}${match[2]}${marker}${match[3]}`;
}

function inlineElementToMarkup(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeInlineMarkup(normalizeText(node.nodeValue));
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const element = node as HTMLElement;
  const tag = element.tagName.toUpperCase();

  if (tag === "SCRIPT" || tag === "STYLE") return "";
  if (tag === "BR") return " ";

  const inner = Array.from(element.childNodes)
    .map(inlineElementToMarkup)
    .join("");

  if (tag === "STRONG" || tag === "B") return wrapMarkup("**", inner);
  if (tag === "EM" || tag === "I") return wrapMarkup("*", inner);
  if (tag === "U") return wrapMarkup("__", inner);

  if (tag === "A") {
    const href = sanitizeHref(element.getAttribute("href") ?? "");
    if (!href) return inner;
    const safeHref = href.replace(/\)/g, "%29").replace(/\\/g, "%5C");
    return `[${inner || escapeInlineMarkup(href)}](${safeHref})`;
  }

  return inner;
}

function inlineElementText(element: Node): string {
  return Array.from(element.childNodes)
    .map(inlineElementToMarkup)
    .join("");
}

function readAlign(element: HTMLElement): TextAlign | undefined {
  const value = (
    element.style.textAlign ||
    element.getAttribute("align") ||
    ""
  ).toLowerCase();
  if (value === "left" || value === "start") return "left";
  if (value === "center") return "center";
  if (value === "right" || value === "end") return "right";
  if (value === "justify") return "justify";
  return undefined;
}

function alignStyle(block: { align?: TextAlign }): string {
  return block.align ? ` style="text-align:${block.align}"` : "";
}

function editorFigure(
  kind: "image" | "embed" | "link",
  attributes: Record<string, string>,
  body: string
): string {
  const attrs = Object.entries(attributes)
    .filter(([, value]) => value !== "")
    .map(([key, value]) => `data-${key}="${escapeAttribute(value)}"`)
    .join(" ");
  return `<figure data-blog-block="${kind}" ${attrs} contenteditable="false" class="blog-editor-media">${body}</figure>`;
}

function imageBlockToEditorHtml(block: Extract<BlogBlock, { type: "image" }>): string {
  const url = safeHttpUrl(block.url);
  const alt = block.alt || block.caption || "Article image";
  const caption = block.caption ?? "";
  const body = `
    <div class="blog-editor-media__frame">
      ${
        url
          ? `<img src="${escapeAttribute(url)}" alt="${escapeAttribute(alt)}" loading="lazy" />`
          : `<p class="blog-editor-media__missing">Image unavailable</p>`
      }
      <button type="button" data-blog-action="remove-media" class="blog-editor-media__remove">Remove</button>
    </div>
    ${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}
  `;
  return editorFigure(
    "image",
    {
      url: url ?? "",
      "public-id": block.publicId ?? "",
      alt: block.alt ?? "",
      caption,
    },
    body
  );
}

function embedBlockToEditorHtml(block: Extract<BlogBlock, { type: "embed" }>): string {
  const label = SOCIAL_EMBED_PROVIDER_LABELS[block.provider] ?? "Social";
  const title = block.title?.trim() || block.url;
  const body = `
    <div class="blog-editor-media__head">
      <span class="blog-editor-media__badge">${escapeHtml(label)}</span>
      <button type="button" data-blog-action="remove-media" class="blog-editor-media__remove">Remove</button>
    </div>
    <p class="blog-editor-media__title">${escapeHtml(title)}</p>
    <p class="blog-editor-media__url">${escapeHtml(block.url)}</p>
    <p class="blog-editor-media__hint">This embed appears as a responsive player on the published page.</p>
  `;
  return editorFigure(
    "embed",
    {
      provider: block.provider,
      url: block.url,
      "embed-url": block.embedUrl,
      title: block.title ?? "",
    },
    body
  );
}

function linkBlockToEditorHtml(block: Extract<BlogBlock, { type: "link" }>): string {
  const body = `
    <div class="blog-editor-media__head">
      <span class="blog-editor-media__badge">External link</span>
      <button type="button" data-blog-action="remove-media" class="blog-editor-media__remove">Remove</button>
    </div>
    <p class="blog-editor-media__title">${escapeHtml(block.title)}</p>
    ${block.description ? `<p class="blog-editor-media__desc">${escapeHtml(block.description)}</p>` : ""}
    <p class="blog-editor-media__url">${escapeHtml(block.url)}</p>
  `;
  return editorFigure(
    "link",
    {
      url: block.url,
      title: block.title,
      description: block.description ?? "",
    },
    body
  );
}

export function blockToEditorHtml(block: BlogBlock): string {
  switch (block.type) {
    case "heading":
      return `<h${block.level}${alignStyle(block)}>${inlineMarkupToHtml(block.text)}</h${block.level}>`;
    case "paragraph":
      return `<p${alignStyle(block)}>${inlineMarkupToHtml(block.text) || "<br>"}</p>`;
    case "bulletList":
    case "orderedList": {
      const tag = block.type === "bulletList" ? "ul" : "ol";
      const items = block.items.length > 0 ? block.items : [""];
      return `<${tag}${alignStyle(block)}>${items
        .map((item) => `<li>${inlineMarkupToHtml(item) || "<br>"}</li>`)
        .join("")}</${tag}>`;
    }
    case "blockquote":
      return `<blockquote${alignStyle(block)}>${inlineMarkupToHtml(block.text) || "<br>"}</blockquote>`;
    case "image":
      return imageBlockToEditorHtml(block);
    case "embed":
      return embedBlockToEditorHtml(block);
    case "link":
      return linkBlockToEditorHtml(block);
    default:
      return "";
  }
}

export function blocksToEditorHtml(blocks: BlogBlock[]): string {
  if (!Array.isArray(blocks)) return "";
  return blocks.map(blockToEditorHtml).join("");
}

function elementFigureToBlock(element: HTMLElement): BlogBlock | null {
  const kind = element.getAttribute("data-blog-block");

  if (kind === "image") {
    const image = element.querySelector("img");
    const url = safeHttpUrl(
      element.dataset.url || image?.getAttribute("src") || ""
    );
    if (!url) return null;
    const publicId = element.dataset.publicId?.trim();
    const caption = element.dataset.caption?.trim();
    return {
      type: "image",
      url,
      ...(publicId ? { publicId } : {}),
      alt: element.dataset.alt?.trim() || image?.getAttribute("alt") || "",
      ...(caption ? { caption } : {}),
    };
  }

  if (kind === "embed") {
    const parsed = parseSocialEmbed(element.dataset.url ?? "");
    if (!parsed) return null;
    const title = element.dataset.title?.trim();
    return {
      type: "embed",
      provider: parsed.provider,
      url: parsed.url,
      embedUrl: parsed.embedUrl,
      ...(title ? { title } : {}),
    };
  }

  if (kind === "link") {
    const url = safeHttpUrl(element.dataset.url);
    if (!url) return null;
    let fallbackTitle = url;
    try {
      fallbackTitle = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      // Keep the full URL as a safe fallback.
    }
    const title = element.dataset.title?.trim() || fallbackTitle;
    const description = element.dataset.description?.trim();
    return {
      type: "link",
      url,
      title,
      ...(description ? { description } : {}),
    };
  }

  return null;
}

function hasBlockChildren(element: HTMLElement): boolean {
  return Array.from(element.children).some((child) =>
    /^(P|H[1-6]|UL|OL|BLOCKQUOTE|FIGURE|DIV|SECTION|ARTICLE)$/i.test(child.tagName)
  );
}

function readListItems(element: HTMLElement): string[] {
  return Array.from(element.children)
    .filter((child) => child.tagName.toUpperCase() === "LI")
    .map((item) => inlineElementText(item).trim())
    .filter(Boolean);
}

/** Rebuild typed blocks from the contenteditable DOM. */
export function editorRootToBlocks(root: HTMLElement): BlogBlock[] {
  const blocks: BlogBlock[] = [];

  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = escapeInlineMarkup(normalizeText(node.nodeValue)).trim();
      if (text) blocks.push({ type: "paragraph", text });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const element = node as HTMLElement;
    const tag = element.tagName.toUpperCase();

    if (tag === "SCRIPT" || tag === "STYLE") return;

    if (tag === "FIGURE" && element.hasAttribute("data-blog-block")) {
      const block = elementFigureToBlock(element);
      if (block) blocks.push(block);
      return;
    }

    if (tag === "H1" || tag === "H2" || tag === "H3" || tag === "H4") {
      const text = inlineElementText(element).trim();
      if (text) {
        const level = tag === "H1" || tag === "H2" ? 2 : tag === "H3" ? 3 : 4;
        const align = readAlign(element);
        blocks.push({
          type: "heading",
          level,
          text,
          ...(align ? { align } : {}),
        });
      }
      return;
    }

    if (tag === "P") {
      const text = inlineElementText(element).trim();
      if (text) {
        const align = readAlign(element);
        blocks.push({
          type: "paragraph",
          text,
          ...(align ? { align } : {}),
        });
      }
      return;
    }

    if (tag === "UL" || tag === "OL") {
      const items = readListItems(element);
      if (items.length > 0) {
        const align = readAlign(element);
        blocks.push({
          type: tag === "UL" ? "bulletList" : "orderedList",
          items,
          ...(align ? { align } : {}),
        });
      }
      return;
    }

    if (tag === "BLOCKQUOTE") {
      const text = inlineElementText(element).replace(/\s+/g, " ").trim();
      if (text) {
        const align = readAlign(element);
        blocks.push({
          type: "blockquote",
          text,
          ...(align ? { align } : {}),
        });
      }
      return;
    }

    if (tag === "DIV" || tag === "SECTION" || tag === "ARTICLE") {
      if (hasBlockChildren(element)) {
        Array.from(element.childNodes).forEach(walk);
        return;
      }
      const text = inlineElementText(element).trim();
      if (text) {
        const align = readAlign(element);
        blocks.push({
          type: "paragraph",
          text,
          ...(align ? { align } : {}),
        });
      }
      return;
    }

    if (tag === "BR") return;

    const text = inlineElementText(element).trim();
    if (text) blocks.push({ type: "paragraph", text });
  };

  Array.from(root.childNodes).forEach(walk);
  return blocks;
}
