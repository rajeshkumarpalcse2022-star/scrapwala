"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface FeaturedForm {
  slug: string;
  title: string;
  subtitle?: string;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(callback: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

/**
 * Homepage hiring promotion. Visible only to authenticated customers
 * (role `user`); admin/collector/logged-out visitors keep the original
 * weighing layout via the `fallback` slot. The API independently verifies
 * the session, so a hidden promo can never expose a closed form.
 */
export default function HiringPromo({ fallback }: { fallback: ReactNode }) {
  const { user, isLoading } = useAuth();
  const [form, setForm] = useState<FeaturedForm | null>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  const isCustomer = !isLoading && !!user && user.role === "user";

  useEffect(() => {
    if (!isCustomer) return;

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/hiring/featured", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const json = await response.json();
        if (!cancelled && json?.success) {
          setForm(json.data?.form ?? null);
        }
      } catch {
        // The promotion simply stays hidden.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isCustomer]);

  if (!isCustomer || !form) return <>{fallback}</>;

  return (
    <div className="relative w-full max-w-[420px]">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-white shadow-lg">
        <div className="relative aspect-video w-full bg-gray-900">
          <video
            src="/videos/we-are-hiring.mp4"
            className="h-full w-full object-cover"
            autoPlay={!reducedMotion}
            muted
            loop
            playsInline
            preload="metadata"
          />
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            We are hiring!
          </span>
        </div>

        <div className="p-5">
          <h3 className="text-lg font-bold leading-snug text-foreground">
            {form.title}
          </h3>
          {form.subtitle && (
            <p className="mt-1 text-sm text-muted">{form.subtitle}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href={`/careers/${form.slug}`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              Apply Now
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/careers"
              className="inline-flex items-center text-sm font-medium text-primary hover:underline"
            >
              All openings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
