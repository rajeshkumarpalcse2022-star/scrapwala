import { Fragment } from "react";
import RemoteImage from "@/components/common/RemoteImage";
import {
  parseInlineText,
  type BlogBlock,
  type InlineNode,
} from "@/lib/utils/blog-content";

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
  2: "mt-10 mb-4 text-2xl sm:text-3xl font-bold tracking-tight text-foreground first:mt-0",
  3: "mt-8 mb-3 text-xl sm:text-2xl font-semibold tracking-tight text-foreground first:mt-0",
  4: "mt-6 mb-2 text-lg font-semibold text-foreground first:mt-0",
};

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
              <Tag key={key} className={HEADING_CLASSES[block.level] ?? HEADING_CLASSES[2]}>
                <InlineContent text={block.text} />
              </Tag>
            );
          }

          case "paragraph":
            return (
              <p
                key={key}
                className="my-5 text-[16.5px] leading-7 text-foreground/85 sm:leading-8"
              >
                <InlineContent text={block.text} />
              </p>
            );

          case "bulletList":
            return (
              <ul
                key={key}
                className="my-5 list-disc space-y-2 pl-6 marker:text-primary text-[16.5px] leading-7 text-foreground/85"
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
                className="my-5 list-decimal space-y-2 pl-6 marker:text-primary marker:font-semibold text-[16.5px] leading-7 text-foreground/85"
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
                className="my-6 rounded-r-xl border-l-4 border-primary/70 bg-primary-light/60 px-5 py-4 text-[16.5px] italic leading-7 text-foreground/85"
              >
                <InlineContent text={block.text} />
              </blockquote>
            );

          case "image":
            return (
              <figure key={key} className="my-7">
                <div className="overflow-hidden rounded-2xl border border-border bg-muted-light">
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

          default:
            return null;
        }
      })}
    </div>
  );
}
