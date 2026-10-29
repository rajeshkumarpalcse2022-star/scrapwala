import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Tag,
  UserRound,
} from "lucide-react";
import Container from "@/components/common/Container";
import RemoteImage from "@/components/common/RemoteImage";
import BlogCard from "@/components/blog/BlogCard";
import BlogShareButtons from "@/components/blog/BlogShareButtons";
import BlogContentRenderer from "@/components/blog/BlogContentRenderer";
import { formatDateFull } from "@/lib/utils/pickup-format";
import {
  getPublishedPostBySlug,
  getRelatedPublishedPosts,
} from "@/services/blog";

// Revalidate every 5 minutes; admin mutations purge the cache immediately
// via revalidateBlogPages(). Published state itself stays DB-driven.
export const revalidate = 300;

const SITE_URL = "https://scrapi.in";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  // Throwing before any streaming starts locks the HTTP status to 404;
  // returning metadata instead would render not-found content with a 200.
  if (!post) notFound();

  const url = `${SITE_URL}/blogs/${post.slug}`;
  const image = post.socialImage?.url ?? post.coverImage?.url;
  const imageAlt = post.socialImage?.alt ?? post.coverImage?.alt ?? post.title;

  return {
    title: post.seoMetaTitle || `${post.title} | Scrapi Blog`,
    description: post.seoMetaDescription || post.excerpt,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      type: "article",
      url,
      title: post.seoMetaTitle || post.title,
      description: post.seoMetaDescription || post.excerpt,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: post.authorName ? [post.authorName] : undefined,
      tags: post.category ? [post.category.name] : undefined,
      images: image ? [{ url: image, alt: imageAlt }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: post.seoMetaTitle || post.title,
      description: post.seoMetaDescription || post.excerpt,
      images: image ? [image] : undefined,
    },
  };
}

export default async function BlogArticlePage({ params }: { params: Params }) {
  const { slug } = await params;

  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();

  const related = await getRelatedPublishedPosts(post, 3);
  const absoluteUrl = `${SITE_URL}/blogs/${post.slug}`;
  const cover = post.coverImage?.url ?? post.socialImage?.url;
  const coverAlt = post.coverImage?.alt ?? post.socialImage?.alt ?? post.title;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Person", name: post.authorName },
    publisher: { "@type": "Organization", name: "Scrapi" },
    mainEntityOfPage: absoluteUrl,
    image: cover ? [cover] : undefined,
    articleSection: post.category?.name,
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <article>
        <Container className="py-10 sm:py-14">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-sm text-muted"
          >
            <Link href="/" className="hover:text-primary">
              Home
            </Link>
            <span aria-hidden>/</span>
            <Link href="/blogs" className="hover:text-primary">
              Blog
            </Link>
            <span aria-hidden>/</span>
            <span className="truncate text-foreground">{post.title}</span>
          </nav>

          <header className="mx-auto mt-6 max-w-3xl">
            {post.category && (
              <Link
                href={`/blogs?category=${post.category.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/20"
              >
                <Tag className="h-3 w-3" aria-hidden />
                {post.category.name}
              </Link>
            )}
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-[40px] lg:leading-tight">
              {post.title}
            </h1>
            {post.subtitle && (
              <p className="mt-3 text-base leading-relaxed text-muted sm:text-lg">
                {post.subtitle}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="h-4 w-4 text-primary" aria-hidden />
                {post.authorName}
              </span>
              <time dateTime={post.publishedAt}>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
                  {formatDateFull(post.publishedAt)}
                </span>
              </time>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" aria-hidden />
                {post.readingTimeMinutes} min read
              </span>
            </div>
          </header>

          {cover && (
            <figure className="mx-auto mt-8 max-w-4xl overflow-hidden rounded-2xl border border-border bg-muted-light">
              <RemoteImage
                src={cover}
                alt={coverAlt}
                loading="eager"
                className="aspect-[16/9] h-auto w-full object-cover"
              />
            </figure>
          )}

          <div className="mx-auto mt-10 max-w-3xl">
            <BlogContentRenderer blocks={post.content} />

            <div className="mt-10 border-t border-border pt-6">
              <BlogShareButtons title={post.title} absoluteUrl={absoluteUrl} />
            </div>

            <Link
              href="/blogs"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to all articles
            </Link>
          </div>
        </Container>
      </article>

      {related.length > 0 && (
        <section className="border-t border-border bg-muted-light/40 py-10 sm:py-14">
          <Container>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              More from{" "}
              {post.category ? post.category.name : "the Scrapi blog"}
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <BlogCard key={item.id} post={item} />
              ))}
            </div>
          </Container>
        </section>
      )}
    </main>
  );
}
