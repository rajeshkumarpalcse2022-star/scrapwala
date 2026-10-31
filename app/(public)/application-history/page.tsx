"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  Loader2,
  ThumbsUp,
  XCircle,
} from "lucide-react";
import Container from "@/components/common/Container";
import { useAuth } from "@/hooks/useAuth";

interface OwnApplication {
  id: string;
  applicationId: string;
  jobTitle: string;
  jobSlug: string;
  status: string;
  submittedAt: string;
  /** Fee payment info when this application carried a fee. */
  payment?: {
    status: string;
    amount: number;
    currency: string;
  };
}

/** Badge + message per status. `submitted` = admin has not decided yet. */
const STATUS_VIEW: Record<
  string,
  { label: string; className: string; message: string; Icon: typeof Clock }
> = {
  submitted: {
    label: "Submitted",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    message:
      "Your application is submitted but not verified yet. Please wait while our team reviews it.",
    Icon: Clock,
  },
  under_review: {
    label: "Under Review",
    className: "border-blue-200 bg-blue-50 text-blue-700",
    message: "Our team is reviewing your application.",
    Icon: Clock,
  },
  shortlisted: {
    label: "Shortlisted",
    className: "border-purple-200 bg-purple-50 text-purple-700",
    message: "Congratulations! You have been shortlisted. We will contact you soon.",
    Icon: ThumbsUp,
  },
  hired: {
    label: "Hired",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    message: "Congratulations! You have been selected for this role.",
    Icon: CheckCircle2,
  },
  rejected: {
    label: "Not Selected",
    className: "border-red-200 bg-red-50 text-red-700",
    message:
      "Thank you for applying. Unfortunately, you were not selected for this position.",
    Icon: XCircle,
  },
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ApplicationHistoryPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [applications, setApplications] = useState<OwnApplication[] | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !user) return;
    if (user.role !== "user") return;

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/hiring/applications", {
          cache: "no-store",
        });
        if (response.status === 401) {
          router.replace("/login?next=/application-history");
          return;
        }
        const json = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok || !json?.success) {
          setError(json?.message || "Failed to load your applications.");
          return;
        }
        setApplications(json.data?.applications ?? []);
      } catch {
        if (!cancelled) {
          setError("Failed to load your applications. Please try again.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login?next=/application-history");
  }, [isLoading, user, router]);

  const roleDenied = !isLoading && !!user && user.role !== "user";

  const handleDownload = useCallback(async (application: OwnApplication) => {
    try {
      const response = await fetch(
        `/api/hiring/applications/${application.id}/pdf`
      );
      if (!response.ok) return;
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `Scrapi-Application-${application.applicationId}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      // Download simply fails silently; the user can retry.
    }
  }, []);

  return (
    <section className="py-12 sm:py-16">
      <Container>
        <div className="mx-auto max-w-[760px]">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to home
          </Link>

          <div className="mt-4">
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              <ClipboardList className="h-6 w-6 text-primary" aria-hidden="true" />
              Application History
            </h1>
            <p className="mt-2 text-sm text-muted">
              Track the status of every job application you have submitted.
            </p>
          </div>

          {roleDenied && (
            <p className="mt-8 rounded-xl border border-border bg-card px-6 py-12 text-center text-muted">
              Application history is available for customer accounts only.
            </p>
          )}

          {(isLoading || (!user && !error)) && (
            <div className="mt-10 flex items-center justify-center py-16 text-muted">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading your applications…
            </div>
          )}

          {error && (
            <p className="mt-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {!isLoading && !error && applications && applications.length === 0 && (
            <div className="mt-8 rounded-2xl border border-border bg-card px-6 py-14 text-center">
              <ClipboardList
                className="mx-auto h-10 w-10 text-muted"
                aria-hidden="true"
              />
              <p className="mt-3 font-semibold text-foreground">
                No applications yet
              </p>
              <p className="mt-1 text-sm text-muted">
                When you apply for a job, you can track its status here.
              </p>
              <Link
                href="/careers"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
              >
                View open positions
              </Link>
            </div>
          )}

          {!isLoading && !error && applications && applications.length > 0 && (
            <div className="mt-8 space-y-4">
              {applications.map((application) => {
                const view =
                  STATUS_VIEW[application.status] ?? STATUS_VIEW.submitted;
                const { Icon } = view;
                return (
                  <div
                    key={application.id}
                    className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-mono text-sm font-bold tracking-wide text-primary">
                            {application.applicationId}
                          </p>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${view.className}`}
                          >
                            <Icon className="h-3 w-3" aria-hidden="true" />
                            {view.label}
                          </span>
                        </div>
                        <h2 className="mt-1.5 text-lg font-bold text-foreground">
                          {application.jobTitle}
                        </h2>
                        <p className="mt-1 text-xs text-muted">
                          Applied on {formatDate(application.submittedAt)}
                        </p>
                        {application.payment?.status === "paid" && (
                          <p className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                            Fee paid ₹
                            {(application.payment.amount / 100).toLocaleString(
                              "en-IN",
                              { maximumFractionDigits: 2 }
                            )}
                          </p>
                        )}
                        <p className="mt-3 text-sm leading-relaxed text-muted">
                          {view.message}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                        {application.status !== "rejected" && (
                          <Link
                            href={`/careers/${application.jobSlug}`}
                            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted-light"
                          >
                            View Opening
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDownload(application)}
                          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/40"
                        >
                          <Download className="h-4 w-4" aria-hidden="true" />
                          Download PDF
                        </button>
                      </div>
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
