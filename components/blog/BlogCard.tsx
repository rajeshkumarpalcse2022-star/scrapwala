"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Recycle } from "lucide-react";
import RemoteImage from "@/components/common/RemoteImage";
import type { PublicBlogCardDTO } from "@/services/blog";
import { formatDateShort } from "@/lib/utils/pickup-format";

/**
 * Public blog card. Uses a plain <img> with an onError fallback so a broken
 * cover URL degrades to a neutral brand panel instead of a broken image.
 * `lead` cards span two columns on large screens for the first row.
 */
interface BlogCardProps {
  post: PublicBlogCardDTO;
  lead?: boolean;
}

export default function BlogCard({ post, lead = false }: BlogCardProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const cover = post.coverImage?.url;
  const showCover = Boolean(cover) && !imageFailed;

  return (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
        lead ? "sm:col-span-2 lg:col-span-2" : ""
      }`}
    >
      <Link
        href={`/blogs/${post.slug}`}
        className="flex h-full flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
      >
        <div
          className={`relative overflow-hidden bg-muted-light ${
            lead ? "aspect-[16/9] sm:aspect-[2/1]" : "aspect-[16/10]"
          }`}
        >
          {showCover ? (
            <RemoteImage
              src={cover as string}
              alt={post.coverImage?.alt || post.title}
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary-light/70">
              <Recycle className="h-8 w-8 text-primary/50" aria-hidden />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-primary-light px-2.5 py-1 font-medium text-primary">
              {post.category?.name ?? "General"}
            </span>
            <span className="text-muted" aria-label={`Published ${formatDateShort(post.publishedAt)}`}>
              {formatDateShort(post.publishedAt)}
            </span>
            <span className="text-muted" aria-hidden>
              ·
            </span>
            <span className="text-muted">{post.readingTimeMinutes} min read</span>
          </div>

          <h3
            className={`mt-3 font-semibold tracking-tight text-foreground ${
              lead ? "text-xl sm:text-2xl" : "text-base sm:text-lg"
            }`}
          >
            {post.title}
          </h3>

          <p
            className={`mt-2 text-sm text-muted ${
              lead ? "line-clamp-2 sm:line-clamp-3" : "line-clamp-2"
            }`}
          >
            {post.excerpt}
          </p>

          <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-xs">
            <span className="truncate text-muted">By {post.authorName}</span>
            <span className="inline-flex shrink-0 items-center gap-1 font-medium text-primary">
              Read Article
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
