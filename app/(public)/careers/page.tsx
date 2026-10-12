"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Users } from "lucide-react";
import Container from "@/components/common/Container";
import { useAuth } from "@/hooks/useAuth";

interface PublicForm {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  description: string;
  instructions?: string;
}

function excerpt(text: string, limit = 220): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trimEnd()}…`;
}

export default function CareersPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [forms, setForms] = useState<PublicForm[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !user) return;
    if (user.role !== "user") return;

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/hiring/forms", { cache: "no-store" });
        const json = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok || !json?.success) {
          setError(json?.message || "Failed to load openings.");
          return;
        }
        setForms(json.data?.forms ?? []);
      } catch {
        if (!cancelled) setError("Failed to load openings. Please try again.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoading, user]);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login?next=/careers");
  }, [isLoading, user, router]);

  return (
    <section className="py-12 sm:py-16">
      <Container>
        <div className="mx-auto max-w-[720px] text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            Careers at ScrapWala
          </span>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
            We are hiring!
          </h1>
          <p className="mt-3 text-base text-muted sm:text-lg">
            Join India&apos;s most trusted doorstep scrap pickup service. Find
            an opening below and apply in minutes.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-[820px]">
          {(isLoading || (!user && !error)) && (
            <div className="flex items-center justify-center py-16 text-muted">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading openings…
            </div>
          )}

          {!isLoading && user && user.role !== "user" && (
            <p className="rounded-xl border border-border bg-card px-6 py-12 text-center text-muted">
              Careers applications are open for customer accounts only.
            </p>
          )}

          {!isLoading && error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
              {error}
            </p>
          )}

          {!isLoading && !error && forms && forms.length === 0 && (
            <p className="rounded-xl border border-border bg-card px-6 py-12 text-center text-muted">
              No open positions right now. Please check back soon!
            </p>
          )}

          {!isLoading && !error && forms && forms.length > 0 && (
            <div className="space-y-4">
              {forms.map((form) => (
                <div
                  key={form.id}
                  className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold text-foreground sm:text-xl">
                        {form.title}
                      </h2>
                      {form.subtitle && (
                        <p className="mt-0.5 text-sm text-muted">
                          {form.subtitle}
                        </p>
                      )}
                      <p className="mt-2 text-sm leading-relaxed text-muted">
                        {excerpt(form.description)}
                      </p>
                    </div>
                    <Link
                      href={`/careers/${form.slug}`}
                      className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/40 sm:self-center"
                    >
                      Apply Now
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
