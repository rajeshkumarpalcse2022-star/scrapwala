import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Clock,
  Layers,
  Leaf,
  Recycle,
  Search,
  SearchX,
  Sparkles,
  UserRound,
} from "lucide-react";
import Container from "@/components/common/Container";
import RemoteImage from "@/components/common/RemoteImage";
import BlogCard from "@/components/blog/BlogCard";
import JsonLd from "@/components/seo/JsonLd";
import { formatDateShort } from "@/lib/utils/pickup-format";
import { publicBlogQuerySchema } from "@/lib/validations/blog";
import {
  getFeaturedPublishedPost,
  listPublishedPosts,
  listPublicBlogCategories,
  type PublicBlogCardDTO,
} from "@/services/blog";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

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
  const isSearch = Boolean(q);

  return buildMetadata({
    title: isSearch
      ? `Search results for “${q}”`
      : "Scrapi Blog – Scrap Recycling, Sustainability & Useful Tips",
    absoluteTitle: true,
    description:
      "Explore helpful articles about scrap recycling, waste management, sustainability, scrap materials, and responsible disposal.",
    path: "/blogs",
    keywords: ["scrap recycling", "recycling tips", "sell scrap online"],
    noIndex: isSearch,
  });
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
          <div className="mx-auto max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
              <SearchX className="h-7 w-7 text-primary" aria-hidden />
            </span>
            <h1 className="mt-4 text-xl font-semibold text-foreground">
              Articles are temporarily unavailable
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              We couldn&apos;t load the blog right now. Please try again in a
              moment.
            </p>
            <Link
              href="/blogs"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
            >
              Try again
              <ArrowRight className="h-4 w-4" aria-hidden />
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
  const allArticlesCount = categories.reduce(
    (sum, item) => sum + item.postCount,
    0,
  );

  return (
    <main>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blogs" },
        ])}
      />
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-secondary">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />

        <Container className="relative py-12 sm:py-16 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur">
                <Leaf className="h-3.5 w-3.5" aria-hidden />
                Scrapi Journal
              </span>
              <h1 className="mt-4 text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-5xl">
                Ideas for a{" "}
                <span className="text-emerald-200">greener</span> tomorrow
              </h1>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-emerald-50/90 sm:text-lg">
                Practical guides on recycling, scrap management and sustainable
                living — written by the people who pick up your scrap every day.
              </p>

              <form
                action="/blogs"
                method="get"
                className="mt-7"
                role="search"
              >
                {category && (
                  <input type="hidden" name="category" value={category} />
                )}
                <div className="flex items-center gap-2 rounded-2xl border border-white/50 bg-white p-1.5 shadow-xl shadow-black/10 focus-within:ring-2 focus-within:ring-white/60">
                  <Search
                    className="ml-2 h-4 w-4 shrink-0 text-muted"
                    aria-hidden
                  />
                  <label htmlFor="blog-search" className="sr-only">
                    Search articles
                  </label>
                  <input
                    id="blog-search"
                    type="search"
                    name="q"
                    defaultValue={q}
                    placeholder="Search recycling guides…"
                    maxLength={80}
                    className="min-w-0 flex-1 bg-transparent px-1 text-sm text-foreground outline-none placeholder:text-muted"
                  />
                  <button
                    type="submit"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Search
                  </button>
                </div>
              </form>

              <dl className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3 text-white/90">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-emerald-200" aria-hidden />
                  <dt className="text-xs uppercase tracking-wide text-emerald-100/80">
                    Guides
                  </dt>
                  <dd className="text-sm font-semibold">{total}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-200" aria-hidden />
                  <dt className="text-xs uppercase tracking-wide text-emerald-100/80">
                    Topics
                  </dt>
                  <dd className="text-sm font-semibold">{categories.length}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <Recycle className="h-4 w-4 text-emerald-200" aria-hidden />
                  <dt className="text-xs uppercase tracking-wide text-emerald-100/80">
                    By
                  </dt>
                  <dd className="text-sm font-semibold">Scrapi team</dd>
                </div>
              </dl>
            </div>

            <HeroFeature
              post={featured ?? latest}
              isFeatured={Boolean(featured)}
            />
          </div>
        </Container>
      </section>

      <section id="articles" className="scroll-mt-24">
        <Container className="relative z-10 -mt-7 sm:-mt-9">
          <div className="rounded-2xl border border-border bg-card p-2.5 shadow-lg shadow-black/5 sm:p-3">
            <nav
              aria-label="Article categories"
              className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <Link
                href={buildHref({ q })}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
                  !category
                    ? "bg-primary text-white shadow-sm"
                    : "bg-muted-light text-foreground hover:bg-primary-light hover:text-primary"
                }`}
              >
                All Articles
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    !category ? "bg-white/20" : "bg-white text-primary"
                  }`}
                >
                  {allArticlesCount}
                </span>
              </Link>
              {categories.map((item) => (
                <Link
                  key={item.id}
                  href={buildHref({ category: item.slug, q })}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
                    category === item.slug
                      ? "bg-primary text-white shadow-sm"
                      : "bg-muted-light text-foreground hover:bg-primary-light hover:text-primary"
                  }`}
                >
                  {item.name}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      category === item.slug
                        ? "bg-white/20"
                        : "bg-white text-primary"
                    }`}
                  >
                    {item.postCount}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        </Container>
      </section>

      <section className="pb-12 pt-8 sm:pb-16 sm:pt-10">
        <Container>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {q ? "Search results" : "Fresh reads"}
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                {activeCategory ? activeCategory.name : "Latest articles"}
              </h2>
              <p className="mt-1.5 text-sm text-muted">
                {total} article{total === 1 ? "" : "s"}
                {q ? ` matching “${q}”` : ""}
              </p>
            </div>
            {hasFilters && (
              <Link
                href="/blogs"
                className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
              >
                Clear filters
              </Link>
            )}
          </div>

          {posts.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
                <SearchX className="h-7 w-7 text-primary" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-semibold">
                {q
                  ? "No articles match your search"
                  : category && !activeCategory
                    ? "Category not found"
                    : category
                      ? `No articles in ${activeCategory?.name ?? "this category"} yet`
                      : "No articles published yet"}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
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
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
            </div>
          ) : (
            <div className="mt-7 grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
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
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
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

      <section className="pb-12 sm:pb-16">
        <Container>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-dark to-primary px-6 py-9 shadow-lg sm:px-10 sm:py-11">
            <div
              className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-white/10 blur-3xl"
              aria-hidden
            />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-100">
                  <Recycle className="h-3.5 w-3.5" aria-hidden />
                  Recycle with Scrapi
                </span>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Ready to turn your scrap into value?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-emerald-50/90 sm:text-base">
                  Book a doorstep pickup, get weighed on the spot and receive the
                  best market rate — no haggling needed.
                </p>
              </div>
              <Link
                href="/pickup"
                className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50 motion-reduce:hover:translate-y-0"
              >
                Schedule a pickup
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}

function HeroFeature({
  post,
  isFeatured,
}: {
  post: PublicBlogCardDTO | null;
  isFeatured: boolean;
}) {
  if (!post) {
    return (
      <div className="rounded-3xl border border-white/25 bg-white/10 p-8 text-white shadow-xl backdrop-blur">
        <Sparkles className="h-8 w-8 text-emerald-200" aria-hidden />
        <h2 className="mt-3 text-xl font-semibold tracking-tight">
          Fresh guides coming your way
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-emerald-50/90">
          Our editors are preparing the first practical guides. Browse every
          published article below while new stories are on the way.
        </p>
        <Link
          href="#articles"
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-100 hover:text-white"
        >
          Browse articles
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <article className="group relative overflow-hidden rounded-3xl bg-white shadow-2xl shadow-black/20 ring-1 ring-white/40">
      <Link
        href={`/blogs/${post.slug}`}
        className="flex h-full flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <div className="relative aspect-[16/9] overflow-hidden bg-muted-light">
          {post.coverImage?.url ? (
            <RemoteImage
              src={post.coverImage.url}
              alt={post.coverImage.alt || post.title}
              loading="eager"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-light via-white to-primary-light">
              <Leaf className="h-12 w-12 text-primary/35" aria-hidden />
            </div>
          )}
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent"
            aria-hidden
          />

          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-primary shadow-sm backdrop-blur">
            {isFeatured ? (
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            )}
            {isFeatured ? "Editor's pick" : "Just published"}
          </span>

          {post.category && (
            <span className="absolute bottom-4 left-4 inline-flex items-center rounded-full bg-black/45 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur">
              {post.category.name}
            </span>
          )}
        </div>

        <div className="p-5 sm:p-6">
          <h2 className="text-xl font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-2xl">
            {post.title}
          </h2>
          {post.subtitle && (
            <p className="mt-1.5 text-sm text-muted">{post.subtitle}</p>
          )}
          <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-foreground/75">
            {post.excerpt}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <UserRound className="h-3.5 w-3.5" aria-hidden />
              {post.authorName}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              {formatDateShort(post.publishedAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {post.readingTimeMinutes} min read
            </span>
          </div>

          <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-primary-dark">
            Read article
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0" />
          </span>
        </div>
      </Link>
    </article>
  );
}
