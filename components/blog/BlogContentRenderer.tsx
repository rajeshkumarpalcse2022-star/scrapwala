import { Fragment } from "react";
import { ExternalLink, Link2 } from "lucide-react";
import RemoteImage from "@/components/common/RemoteImage";
import {
  blogHeadingAnchor,
  parseInlineText,
  sanitizeHref,
  type BlogBlock,
  type InlineNode,
  type TextAlign,
} from "@/lib/utils/blog-content";
import {
  parseSocialEmbed,
  SOCIAL_EMBED_PROVIDER_LABELS,
  type SocialEmbedProvider,
} from "@/lib/utils/social-embeds";

/**
 * Renders structured article blocks as semantic React elements.
 * Content is never injected as HTML: inline markup is tokenised into typed
 * nodes and rendered as elements, so stored content cannot execute scripts.
 */

function renderInline(nodes: InlineNode[]): React.ReactNode[] {
  return nodes.map((node, index) => {
    const key = `i${index}`;
    switch (node.type) {
      case "strong":
        return <strong key={key}>{renderInline(node.children)}</strong>;
      case "em":
        return <em key={key}>{renderInline(node.children)}</em>;
      case "underline":
        return (
          <u key={key} className="decoration-primary/50 underline-offset-2">
            {renderInline(node.children)}
          </u>
        );
      case "a":
        return (
          <a
            key={key}
            href={node.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
          >
            {renderInline(node.children)}
          </a>
        );
      case "text":
      default:
        return <Fragment key={key}>{node.value}</Fragment>;
    }
  });
}

export function InlineContent({ text }: { text: string }) {
  return <>{renderInline(parseInlineText(text))}</>;
}

interface BlogContentRendererProps {
  blocks: BlogBlock[];
  className?: string;
}

const HEADING_CLASSES: Record<number, string> = {
  2: "group relative mt-12 mb-4 scroll-mt-24 border-b border-border pb-2 text-2xl font-bold tracking-tight text-foreground first:mt-0 sm:text-3xl",
  3: "mt-9 mb-3 scroll-mt-24 text-xl font-semibold tracking-tight text-foreground first:mt-0 sm:text-2xl",
  4: "mt-7 mb-2 scroll-mt-24 text-lg font-semibold text-foreground first:mt-0",
};

const ALIGN_CLASSES: Record<TextAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
  justify: "text-justify",
};

const EMBED_FRAME_CLASSES: Record<SocialEmbedProvider, string> = {
  youtube: "aspect-video",
  vimeo: "aspect-video",
  facebook: "h-[560px] max-h-[80vh] sm:h-[640px]",
  instagram: "mx-auto h-[640px] max-h-[80vh] max-w-[540px]",
};

function alignmentClass(align?: TextAlign): string {
  return align ? ALIGN_CLASSES[align] : "";
}

function ExternalLinkCard({
  url,
  title,
  description,
  fallback = false,
}: {
  url: string;
  title: string;
  description?: string;
  fallback?: boolean;
}) {
  const href = sanitizeHref(url);
  if (!href) return null;

  let host = href;
  try {
    host = new URL(href).hostname.replace(/^www\./, "");
  } catch {
    // Keep the full URL when parsing fails.
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="my-6 flex items-start gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/30 hover:bg-card-hover sm:p-5"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
        <Link2 className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold uppercase tracking-wide text-primary">
          {fallback ? "View original post" : "Recommended link"}
        </span>
        <span className="mt-1 block font-semibold leading-snug text-foreground">
          {title}
        </span>
        {description && (
          <span className="mt-1 block text-sm leading-relaxed text-muted">
            {description}
          </span>
        )}
        <span className="mt-1.5 block truncate text-xs text-muted">{host}</span>
      </span>
      <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-muted" aria-hidden />
    </a>
  );
}

export default function BlogContentRenderer({
  blocks,
  className = "",
}: BlogContentRendererProps) {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return null;
  }

  return (
    <div className={`blog-content ${className}`}>
      {blocks.map((block, index) => {
        const key = `b${index}`;

        switch (block.type) {
          case "heading": {
            const Tag = (`h${block.level}` as const) satisfies
              | "h2"
              | "h3"
              | "h4";
            return (
              <Tag
                key={key}
                id={blogHeadingAnchor(block.text, index)}
                className={`${HEADING_CLASSES[block.level] ?? HEADING_CLASSES[2]} ${alignmentClass(block.align)}`}
              >
                {block.level === 2 && (
                  <span
                    className="absolute -left-4 top-1.5 hidden h-6 w-1.5 rounded-full bg-gradient-to-b from-primary to-secondary sm:block"
                    aria-hidden
                  />
                )}
                <InlineContent text={block.text} />
              </Tag>
            );
          }

          case "paragraph":
            return (
              <p
                key={key}
                className={`my-5 text-[16.5px] leading-7 text-foreground/85 first:mt-0 sm:text-[17px] sm:leading-8 ${alignmentClass(block.align)}`}
              >
                <InlineContent text={block.text} />
              </p>
            );

          case "bulletList":
            return (
              <ul
                key={key}
                className={`my-5 list-disc space-y-2 pl-6 marker:text-primary text-[16.5px] leading-7 text-foreground/85 ${alignmentClass(block.align)}`}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>
                    <InlineContent text={item} />
                  </li>
                ))}
              </ul>
            );

          case "orderedList":
            return (
              <ol
                key={key}
                className={`my-5 list-decimal space-y-2 pl-6 marker:text-primary marker:font-semibold text-[16.5px] leading-7 text-foreground/85 ${alignmentClass(block.align)}`}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>
                    <InlineContent text={item} />
                  </li>
                ))}
              </ol>
            );

          case "blockquote":
            return (
              <blockquote
                key={key}
                className={`my-7 rounded-2xl border border-primary/15 bg-gradient-to-r from-primary-light/80 to-transparent px-5 py-5 text-[16.5px] italic leading-7 text-foreground/85 sm:text-[17px] ${alignmentClass(block.align)}`}
              >
                <span className="mb-1 block font-serif text-3xl leading-none text-primary/50" aria-hidden>
                  “
                </span>
                <InlineContent text={block.text} />
              </blockquote>
            );

          case "image":
            return (
              <figure key={key} className="my-8">
                <div className="overflow-hidden rounded-2xl border border-border bg-muted-light shadow-sm">
                  <RemoteImage
                    src={block.url}
                    alt={block.alt || block.caption || "Article image"}
                    className="h-auto w-full object-contain"
                  />
                </div>
                {block.caption && (
                  <figcaption className="mt-2 text-center text-xs text-muted">
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );

          case "embed": {
            const embed = parseSocialEmbed(block.url);
            if (!embed) {
              return (
                <ExternalLinkCard
                  key={key}
                  url={block.url}
                  title={block.title || "View original post"}
                  fallback
                />
              );
            }

            const label =
              SOCIAL_EMBED_PROVIDER_LABELS[embed.provider] ?? "Social post";
            return (
              <figure key={key} className="my-8">
                <div
                  className={`overflow-hidden rounded-2xl border border-border bg-black shadow-sm ${EMBED_FRAME_CLASSES[embed.provider]}`}
                >
                  <iframe
                    src={embed.embedUrl}
                    title={block.title || `${label} embed`}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-presentation"
                    className="h-full w-full border-0"
                  />
                </div>
                <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <span>
                    {label}
                    {block.title ? ` · ${block.title}` : ""}
                  </span>
                  <a
                    href={embed.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary-dark"
                  >
                    Open original
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </figcaption>
              </figure>
            );
          }

          case "link":
            return (
              <ExternalLinkCard
                key={key}
                url={block.url}
                title={block.title}
                description={block.description}
              />
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
