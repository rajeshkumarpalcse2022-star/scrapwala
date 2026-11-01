import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Clock,
  ListTree,
  Recycle,
  Tag,
} from "lucide-react";
import Container from "@/components/common/Container";
import RemoteImage from "@/components/common/RemoteImage";
import BlogCard from "@/components/blog/BlogCard";
import BlogShareButtons from "@/components/blog/BlogShareButtons";
import BlogContentRenderer from "@/components/blog/BlogContentRenderer";
import ArticleReadingProgress from "@/components/blog/ArticleReadingProgress";
import { extractHeadings } from "@/lib/utils/blog-content";
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
  const authorInitial = (post.authorName?.trim()?.charAt(0) || "S").toUpperCase();

  const headings = extractHeadings(post.content).filter(
    (heading) => heading.level === 2 || heading.level === 3,
  );

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
      <ArticleReadingProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <article>
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary-light/80 via-background to-background">
          <div
            className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
            aria-hidden
          />
          <Container className="relative pb-8 pt-7 sm:pb-10 sm:pt-9">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-2 overflow-hidden text-sm text-muted"
            >
              <Link href="/" className="shrink-0 hover:text-primary">
                Home
              </Link>
              <span aria-hidden>/</span>
              <Link href="/blogs" className="shrink-0 hover:text-primary">
                Blog
              </Link>
              <span aria-hidden>/</span>
              <span className="truncate text-foreground">{post.title}</span>
            </nav>

            <header className="mx-auto mt-7 max-w-4xl text-center sm:mt-9">
              {post.category && (
                <Link
                  href={`/blogs?category=${post.category.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-white px-3.5 py-1.5 text-xs font-semibold text-primary shadow-sm transition hover:border-primary/30 hover:bg-primary-light"
                >
                  <Tag className="h-3 w-3" aria-hidden />
                  {post.category.name}
                </Link>
              )}

              <h1 className="mx-auto mt-4 max-w-3xl text-[28px] font-bold leading-[1.15] tracking-tight text-foreground sm:text-4xl lg:text-[44px]">
                {post.title}
              </h1>

              {post.subtitle && (
                <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
                  {post.subtitle}
                </p>
              )}

              <div className="mx-auto mt-6 flex max-w-2xl flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap sm:gap-0">
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white"
                    aria-hidden
                  >
                    {authorInitial}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {post.authorName || "Scrapi Team"}
                  </span>
                </div>
                <span className="hidden h-4 w-px bg-border sm:mx-4 sm:block" aria-hidden />
                <time
                  dateTime={post.publishedAt}
                  className="inline-flex items-center gap-1.5 text-sm text-muted"
                >
                  <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
                  {formatDateFull(post.publishedAt)}
                </time>
                <span className="hidden h-4 w-px bg-border sm:mx-4 sm:block" aria-hidden />
                <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                  <Clock className="h-4 w-4 text-primary" aria-hidden />
                  {post.readingTimeMinutes} min read
                </span>
              </div>
            </header>

            {cover && (
              <figure className="mx-auto mt-8 max-w-5xl overflow-hidden rounded-2xl border border-border bg-muted-light shadow-xl shadow-primary/5 sm:mt-10 sm:rounded-3xl">
                <RemoteImage
                  src={cover}
                  alt={coverAlt}
                  loading="eager"
                  className="aspect-[16/9] h-auto w-full object-cover"
                />
              </figure>
            )}
          </Container>
        </section>

        <Container className="py-9 sm:py-12">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_250px] lg:gap-12">
            <div className="min-w-0">
              {headings.length >= 2 && (
                <details className="group mb-8 rounded-2xl border border-border bg-card p-2 lg:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground">
                    <span className="inline-flex items-center gap-2">
                      <ListTree className="h-4 w-4 text-primary" aria-hidden />
                      On this page
                    </span>
                    <ChevronDown
                      className="h-4 w-4 text-muted transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <nav aria-label="Table of contents" className="px-3 pb-3 pt-1">
                    <ol className="space-y-2 border-l border-border pl-4 text-sm">
                      {headings.map((heading) => (
                        <li key={heading.id}>
                          <a
                            href={`#${heading.id}`}
                            className={`block leading-snug text-muted transition hover:text-primary ${
                              heading.level === 3 ? "pl-3 text-[13px]" : ""
                            }`}
                          >
                            {heading.text}
                          </a>
                        </li>
                      ))}
                    </ol>
                  </nav>
                </details>
              )}

              <div className="max-w-3xl">
                <BlogContentRenderer blocks={post.content} />
              </div>

              <div className="mt-10 flex flex-col gap-4 rounded-2xl border border-primary/15 bg-primary-light/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
                    <Recycle className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">
                      Scrap piling up at home?
                    </h2>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted">
                      Book a doorstep pickup and get the best market rate.
                    </p>
                  </div>
                </div>
                <Link
                  href="/pickup"
                  className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
                >
                  Schedule pickup
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>

              <div className="mt-8">
                <BlogShareButtons
                  title={post.title}
                  absoluteUrl={absoluteUrl}
                />
              </div>

              <Link
                href="/blogs"
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Back to all articles
              </Link>
            </div>

            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-5">
                {headings.length >= 2 && (
                  <nav
                    aria-label="Table of contents"
                    className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                  >
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                      <ListTree className="h-3.5 w-3.5 text-primary" aria-hidden />
                      On this page
                    </p>
                    <ol className="mt-3 space-y-2.5 border-l border-border pl-4 text-sm">
                      {headings.map((heading) => (
                        <li key={heading.id}>
                          <a
                            href={`#${heading.id}`}
                            className={`block leading-snug text-muted transition hover:text-primary ${
                              heading.level === 3 ? "pl-3 text-[13px]" : ""
                            }`}
                          >
                            {heading.text}
                          </a>
                        </li>
                      ))}
                    </ol>
                  </nav>
                )}

                <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary-dark to-primary p-5 text-white shadow-sm">
                  <BookOpen className="h-6 w-6 text-emerald-200" aria-hidden />
                  <p className="mt-2 text-sm font-semibold">Recycle smarter</p>
                  <p className="mt-1 text-xs leading-relaxed text-emerald-50/90">
                    Get a fair price for your scrap with a free doorstep pickup.
                  </p>
                  <Link
                    href="/pickup"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-primary transition hover:bg-emerald-50"
                  >
                    Book pickup
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </article>

      {related.length > 0 && (
        <section className="border-t border-border bg-muted-light/40 py-10 sm:py-14">
          <Container>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Keep reading
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  More from{" "}
                  {post.category ? post.category.name : "the Scrapi blog"}
                </h2>
              </div>
              <Link
                href="/blogs"
                className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                View all articles
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
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
