"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock3, Recycle, Sparkles } from "lucide-react";
import RemoteImage from "@/components/common/RemoteImage";
import type { PublicBlogCardDTO } from "@/services/blog";
import { formatDateShort } from "@/lib/utils/pickup-format";
import { cn } from "@/lib/utils";

/**
 * Public blog card. Uses a Next Image wrapper with an onError fallback so a
 * broken cover URL degrades to a neutral brand panel instead of a broken
 * image. `lead` cards span two columns and switch to a horizontal layout on
 * desktop for an editorial front-page feel.
 */
interface BlogCardProps {
  post: PublicBlogCardDTO;
  lead?: boolean;
}

export default function BlogCard({ post, lead = false }: BlogCardProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const cover = post.coverImage?.url;
  const showCover = Boolean(cover) && !imageFailed;
  const authorInitial = (post.authorName?.trim()?.charAt(0) || "S").toUpperCase();

  return (
    <article
      className={cn(
        "group relative h-full",
        lead && "sm:col-span-2 lg:col-span-2",
      )}
    >
      <Link
        href={`/blogs/${post.slug}`}
        className={cn(
          "flex h-full flex-col overflow-hidden rounded-3xl border border-border/80 bg-card shadow-[0_1px_3px_rgba(16,44,24,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_24px_55px_-28px_rgba(20,90,46,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
          lead && "lg:flex-row",
        )}
      >
        <div
          className={cn(
            "relative shrink-0 overflow-hidden bg-muted-light",
            lead
              ? "aspect-[16/9] lg:aspect-auto lg:min-h-[320px] lg:w-[46%]"
              : "aspect-[16/10]",
          )}
        >
          {showCover ? (
            <RemoteImage
              src={cover as string}
              alt={post.coverImage?.alt || post.title}
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
            />
          ) : (
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary-light via-white to-primary-light">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl" aria-hidden />
              <Recycle className="h-10 w-10 text-primary/45" aria-hidden />
            </div>
          )}

          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent opacity-80"
            aria-hidden
          />

          <span className="absolute bottom-3 left-3 inline-flex items-center rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary shadow-sm backdrop-blur">
            {post.category?.name ?? "General"}
          </span>

          {post.isFeatured && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm backdrop-blur">
              <Sparkles className="h-3 w-3" aria-hidden />
              Featured
            </span>
          )}
        </div>

        <div
          className={cn(
            "flex flex-1 flex-col p-5 sm:p-6",
            lead && "lg:justify-center lg:p-8",
          )}
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <span aria-label={`Published ${formatDateShort(post.publishedAt)}`}>
              {formatDateShort(post.publishedAt)}
            </span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" aria-hidden />
              {post.readingTimeMinutes} min read
            </span>
          </div>

          <h3
            className={cn(
              "mt-2.5 font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary",
              lead ? "text-xl sm:text-2xl lg:text-[28px] lg:leading-tight" : "text-base sm:text-lg",
            )}
          >
            {post.title}
          </h3>

          <p
            className={cn(
              "mt-2 text-sm leading-relaxed text-muted",
              lead ? "line-clamp-3" : "line-clamp-2",
            )}
          >
            {post.excerpt}
          </p>

          <div className="flex-1" aria-hidden />

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/70 pt-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary"
                aria-hidden
              >
                {authorInitial}
              </span>
              <span className="truncate text-xs font-medium text-foreground/80">
                {post.authorName || "Scrapi Team"}
              </span>
            </div>

            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
              Read
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
