"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, IndianRupee, Loader2, Megaphone, Users } from "lucide-react";
import Container from "@/components/common/Container";
import RemoteImage from "@/components/common/RemoteImage";
import { useAuth } from "@/hooks/useAuth";
import { formatHiringPrice } from "@/lib/utils/hiring-fields";

interface PublicForm {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  description: string;
  instructions?: string;
  /** Application fee in rupees; 0 or missing = free. */
  price?: number;
}

interface PublicNotice {
  imageUrl: string;
  updatedAt: string;
}

function excerpt(text: string, limit = 220): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trimEnd()}…`;
}

// Each hiring card cycles through this palette so multiple openings look
// distinct and attractive. Classes are static strings so Tailwind can see them.
const CARD_THEMES = [
  {
    card: "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white",
    button: "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/40",
  },
  {
    card: "border-blue-200 bg-gradient-to-br from-blue-50 via-white to-white",
    button: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500/40",
  },
  {
    card: "border-purple-200 bg-gradient-to-br from-purple-50 via-white to-white",
    button: "bg-purple-600 hover:bg-purple-700 focus:ring-purple-500/40",
  },
  {
    card: "border-rose-200 bg-gradient-to-br from-rose-50 via-white to-white",
    button: "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500/40",
  },
  {
    card: "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white",
    button: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500/40",
  },
  {
    card: "border-teal-200 bg-gradient-to-br from-teal-50 via-white to-white",
    button: "bg-teal-600 hover:bg-teal-700 focus:ring-teal-500/40",
  },
  {
    card: "border-orange-200 bg-gradient-to-br from-orange-50 via-white to-white",
    button: "bg-orange-600 hover:bg-orange-700 focus:ring-orange-500/40",
  },
  {
    card: "border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-white",
    button: "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500/40",
  },
];

export default function CareersPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [forms, setForms] = useState<PublicForm[] | null>(null);
  const [notice, setNotice] = useState<PublicNotice | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !user) return;
    if (user.role !== "user") return;

    let cancelled = false;
    (async () => {
      try {
        const [formsResponse, noticeResponse] = await Promise.all([
          fetch("/api/hiring/forms", { cache: "no-store" }),
          fetch("/api/hiring/notice", { cache: "no-store" }),
        ]);
        const [json, noticeJson] = await Promise.all([
          formsResponse.json().catch(() => null),
          noticeResponse.json().catch(() => null),
        ]);
        if (cancelled) return;
        if (!formsResponse.ok || !json?.success) {
          setError(json?.message || "Failed to load openings.");
          return;
        }
        setForms(json.data?.forms ?? []);
        if (noticeResponse.ok && noticeJson?.success) {
          setNotice(noticeJson.data?.notice ?? null);
        }
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
            Careers at Scrapi
          </span>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
            We are hiring!
          </h1>
          <p className="mt-3 text-base text-muted sm:text-lg">
            Join India&apos;s most trusted doorstep scrap pickup service. Find
            an opening below and apply in minutes.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-[820px] space-y-6">
          {notice?.imageUrl && (
            <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-card shadow-[0_2px_16px_rgba(16,94,58,0.08)]">
              <div className="flex items-center gap-2 border-b border-emerald-100 bg-emerald-50/70 px-4 py-3">
                <Megaphone className="h-4 w-4 text-primary" aria-hidden="true" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                  Notice
                </h2>
              </div>
              <div className="bg-gradient-to-br from-emerald-50/50 via-white to-white p-2 sm:p-3">
                <RemoteImage
                  src={notice.imageUrl}
                  alt="Scrapi hiring notice"
                  className="mx-auto block max-h-[480px] w-full rounded-lg object-contain"
                  loading="eager"
                />
              </div>
            </div>
          )}

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
              {forms.map((form, index) => {
                const theme = CARD_THEMES[index % CARD_THEMES.length];
                return (
                  <div
                    key={form.id}
                    className={`rounded-xl border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-6 ${theme.card}`}
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
                        {(form.price ?? 0) > 0 && (
                          <p className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-border bg-white/70 px-2.5 py-0.5 text-xs font-semibold text-foreground">
                            <IndianRupee
                              className="h-3 w-3 text-primary"
                              aria-hidden="true"
                            />
                            Application fee {formatHiringPrice(form.price)}
                          </p>
                        )}
                        <p className="mt-2 text-sm leading-relaxed text-muted">
                          {excerpt(form.description)}
                        </p>
                      </div>
                      <Link
                        href={`/careers/${form.slug}`}
                        className={`inline-flex shrink-0 items-center gap-2 self-start rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 sm:self-center ${theme.button}`}
                      >
                        Apply Now
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
