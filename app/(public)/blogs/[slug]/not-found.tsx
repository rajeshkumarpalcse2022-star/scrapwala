import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Leaf } from "lucide-react";
import Container from "@/components/common/Container";

export const metadata: Metadata = {
  title: "Article not found | Scrapi Blog",
  robots: { index: false, follow: true },
};

/** Themed 404 for unknown or unpublished article slugs. */
export default function BlogArticleNotFound() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center py-16">
      <Container>
        <div className="mx-auto max-w-md text-center">
          <Leaf className="mx-auto h-12 w-12 text-primary/50" aria-hidden />
          <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            Article not found
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            This article may have been unpublished, renamed, or it never
            existed. Browse the blog to find something fresh.
          </p>
          <Link
            href="/blogs"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to all articles
          </Link>
        </div>
      </Container>
    </main>
  );
}
