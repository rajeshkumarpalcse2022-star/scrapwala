import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Leaf,
  SearchX,
  Sparkles,
  UserRound,
} from "lucide-react";
import Container from "@/components/common/Container";
import RemoteImage from "@/components/common/RemoteImage";
import BlogCard from "@/components/blog/BlogCard";
import { formatDateShort } from "@/lib/utils/pickup-format";
import { publicBlogQuerySchema } from "@/lib/validations/blog";
import {
  getFeaturedPublishedPost,
  listPublishedPosts,
  listPublicBlogCategories,
  type PublicBlogCardDTO,
} from "@/services/blog";

export const dynamic = "force-dynamic";

const SITE_URL = "https://scrapi.in";
const PAGE_SIZE = 9;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function buildHref(options: {
  category?: string | null;
  q?: string | null;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (options.category) params.set("category", options.category);
  if (options.q) params.set("q", options.q);
  if (options.page && options.page > 1) params.set("page", String(options.page));
  const query = params.toString();
  return query ? `/blogs?${query}` : "/blogs";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const raw = await searchParams;
  const q = first(raw.q)?.trim();

  return {
    title: q ? `Search: ${q} | ScrapWala Blog` : "Blog | ScrapWala",
    description:
      "Practical guides on scrap recycling, sustainable living and getting the best value for your recyclables — from the ScrapWala team.",
    alternates: {
      canonical: `${SITE_URL}/blogs`,
    },
  };
}

export default async function BlogListingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const raw = await searchParams;

  const parsedQuery = publicBlogQuerySchema.safeParse({
    page: first(raw.page),
    limit: String(PAGE_SIZE),
    category: first(raw.category) || undefined,
    q: first(raw.q) || undefined,
  });

  const { page = 1, category, q } = parsedQuery.success
    ? parsedQuery.data
    : { page: 1, category: undefined, q: undefined };

  let categories: Awaited<ReturnType<typeof listPublicBlogCategories>> = [];
  let featured: PublicBlogCardDTO | null = null;
  let latest: PublicBlogCardDTO | null = null;
  let result: Awaited<ReturnType<typeof listPublishedPosts>> | null = null;
  let failed = false;

  try {
    [categories, featured] = await Promise.all([
      listPublicBlogCategories(),
      getFeaturedPublishedPost(),
    ]);

    if (!featured) {
      // When nothing is explicitly featured, the hero honestly showcases the
      // newest published article (globally, independent of filters/page).
      const latestResult = await listPublishedPosts({ page: 1, limit: 1 });
      latest = latestResult.posts[0] ?? null;
    }

    result = await listPublishedPosts({
      page,
      limit: PAGE_SIZE,
      category,
      q,
    });
  } catch {
    failed = true;
  }

  if (failed || !result) {
    return (
      <main className="py-10 sm:py-14 lg:py-16">
        <Container>
          <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <SearchX className="mx-auto h-10 w-10 text-muted" aria-hidden />
            <h1 className="mt-4 text-xl font-semibold text-foreground">
              Articles are temporarily unavailable
            </h1>
            <p className="mt-2 text-sm text-muted">
              We couldn&apos;t load the blog right now. Please try again in a
              moment.
            </p>
            <Link
              href="/blogs"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
            >
              Try again
            </Link>
          </div>
        </Container>
      </main>
    );
  }

  const {
    posts,
    total,
    page: currentPage,
    totalPages,
    category: resolvedCategory,
  } = result;
  // The service resolves the category server-side (null when the slug is
  // unknown or the category is archived).
  const activeCategory = resolvedCategory;
  const showLeadCard = !q && !category && page === 1 && posts.length > 0;
  const hasFilters = Boolean(q || category);

  return (
    <main>
      <section className="border-b border-border bg-primary-light">
        <Container className="py-10 sm:py-14 lg:py-16">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                <Leaf className="h-3.5 w-3.5" aria-hidden />
                ScrapWala Journal
              </span>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-[42px]">
                Ideas for a Greener Tomorrow
              </h1>
              <p className="mt-4 text-base leading-relaxed text-foreground/75 sm:text-lg">
                Practical guides on recycling, scrap management and sustainable
                living — written by the people who pick up your scrap every day.
              </p>

              <form
                action="/blogs"
                method="get"
                className="mt-6"
                role="search"
              >
                {category && (
                  <input type="hidden" name="category" value={category} />
                )}
                <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-white/80 p-1.5 shadow-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
                  <label htmlFor="blog-search" className="sr-only">
                    Search articles
                  </label>
                  <input
                    id="blog-search"
                    type="search"
                    name="q"
                    defaultValue={q}
                    placeholder="Search articles…"
                    maxLength={80}
                    className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted"
                  />
                  <button
                    type="submit"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <ArrowRight className="h-4 w-4" aria-hidden />
                    Search
                  </button>
                </div>
              </form>
            </div>

            <HeroFeature featured={featured} latest={latest} />
          </div>
        </Container>
      </section>

      <section id="articles" className="py-8 sm:py-10 scroll-mt-20">
        <Container>
          <nav
            aria-label="Article categories"
            className="flex flex-wrap items-center gap-2"
          >
            <Link
              href={buildHref({ q })}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                !category
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-card text-foreground hover:border-primary/40 hover:text-primary"
              }`}
            >
              All Articles
            </Link>
            {categories.map((item) => (
              <Link
                key={item.id}
                href={buildHref({ category: item.slug, q })}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  category === item.slug
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-card text-foreground hover:border-primary/40 hover:text-primary"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {activeCategory ? activeCategory.name : "All Articles"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {total} article
                {total === 1 ? "" : "s"}
                {q ? ` matching “${q}”` : ""}
              </p>
            </div>
            {hasFilters && (
              <Link
                href="/blogs"
                className="text-sm font-medium text-primary hover:underline"
              >
                Clear filters
              </Link>
            )}
          </div>

          {posts.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <SearchX
                className="mx-auto h-10 w-10 text-muted"
                aria-hidden
              />
              <h3 className="mt-4 text-lg font-semibold">
                {q
                  ? "No articles match your search"
                  : category && !activeCategory
                    ? "Category not found"
                    : category
                      ? `No articles in ${activeCategory?.name ?? "this category"} yet`
                      : "No articles published yet"}
              </h3>
              <p className="mt-2 text-sm text-muted">
                {q
                  ? "Try different keywords or clear the filters to browse everything."
                  : category && !activeCategory
                    ? "This category may have been removed or archived."
                    : "Check back soon — new guides are published regularly."}
              </p>
              {hasFilters && (
                <Link
                  href="/blogs"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
                >
                  Browse all articles
                </Link>
              )}
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, index) => (
                <BlogCard
                  key={post.id}
                  post={post}
                  lead={showLeadCard && index === 0}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav
              aria-label="Blog pagination"
              className="mt-10 flex flex-col items-center gap-4 border-t border-border pt-6 sm:flex-row sm:justify-between"
            >
              <p className="text-sm text-muted">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                {currentPage > 1 ? (
                  <Link
                    href={buildHref({
                      category,
                      q,
                      page: currentPage - 1,
                    })}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:border-primary/40 hover:text-primary"
                  >
                    ← Previous
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted/60"
                  >
                    ← Previous
                  </span>
                )}
                {currentPage < totalPages ? (
                  <Link
                    href={buildHref({
                      category,
                      q,
                      page: currentPage + 1,
                    })}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
                  >
                    Next →
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted/60"
                  >
                    Next →
                  </span>
                )}
              </div>
            </nav>
          )}
        </Container>
      </section>
    </main>
  );
}

function HeroFeature({
  featured,
  latest,
}: {
  featured: PublicBlogCardDTO | null;
  latest: PublicBlogCardDTO | null;
}) {
  if (featured) {
    return (
      <article className="overflow-hidden rounded-2xl border border-primary/20 bg-white/80 shadow-sm">
        <Link
          href={`/blogs/${featured.slug}`}
          className="group flex h-full flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
        >
          <div className="relative aspect-[16/9] overflow-hidden bg-muted-light">
            {featured.coverImage?.url ? (
              <RemoteImage
                src={featured.coverImage.url}
                alt={featured.coverImage.alt || featured.title}
                loading="eager"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02] motion-reduce:group-hover:scale-100"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary-light/70">
                <Leaf className="h-10 w-10 text-primary/40" aria-hidden />
              </div>
            )}
          </div>
          <div className="p-5 sm:p-6">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3 w-3" aria-hidden />
              Featured
            </span>
            <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
              {featured.title}
            </h2>
            {featured.subtitle && (
              <p className="mt-1.5 text-sm text-muted">{featured.subtitle}</p>
            )}
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-foreground/75">
              {featured.excerpt}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <UserRound className="h-3.5 w-3.5" aria-hidden />
                {featured.authorName}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                {formatDateShort(featured.publishedAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {featured.readingTimeMinutes} min read
              </span>
            </div>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              Read Article
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0" />
            </span>
          </div>
        </Link>
      </article>
    );
  }

  if (latest) {
    return (
      <article className="overflow-hidden rounded-2xl border border-primary/20 bg-white/80 shadow-sm">
        <Link
          href={`/blogs/${latest.slug}`}
          className="group flex h-full flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
        >
          <div className="relative aspect-[16/9] overflow-hidden bg-muted-light">
            {latest.coverImage?.url ? (
              <RemoteImage
                src={latest.coverImage.url}
                alt={latest.coverImage.alt || latest.title}
                loading="eager"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02] motion-reduce:group-hover:scale-100"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary-light/70">
                <Leaf className="h-10 w-10 text-primary/40" aria-hidden />
              </div>
            )}
          </div>
          <div className="p-5 sm:p-6">
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-foreground/70 ring-1 ring-border">
              <CalendarDays className="h-3 w-3" aria-hidden />
              Latest article
            </span>
            <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
              {latest.title}
            </h2>
            {latest.subtitle && (
              <p className="mt-1.5 text-sm text-muted">{latest.subtitle}</p>
            )}
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-foreground/75">
              {latest.excerpt}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <UserRound className="h-3.5 w-3.5" aria-hidden />
                {latest.authorName}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                {formatDateShort(latest.publishedAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {latest.readingTimeMinutes} min read
              </span>
            </div>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              Read Article
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0" />
            </span>
          </div>
        </Link>
      </article>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-primary/30 bg-white/60 p-8">
      <Sparkles className="h-8 w-8 text-primary/60" aria-hidden />
      <h2 className="mt-3 text-lg font-semibold tracking-tight sm:text-xl">
        Fresh guides coming your way
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground/75">
        Our editors highlight one practical guide at a time. Browse every
        published article below while the first stories are being prepared.
      </p>
      <Link
        href="#articles"
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        Browse articles
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}
