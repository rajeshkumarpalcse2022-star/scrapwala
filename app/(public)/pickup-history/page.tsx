"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  History,
  Loader2,
  ShieldAlert,
  Truck,
  Weight,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { VEHICLE_OPTIONS } from "@/lib/constants/pickup";
import {
  formatDateShort,
  formatTime12,
  getStatusBadge,
} from "@/lib/utils/pickup-format";
import {
  isActiveStatus,
  isCancelledStatus,
  isCompletedStatus,
} from "@/lib/constants/pickup";
import { cn } from "@/lib/utils";

interface HistoryPickup {
  pickupId: string;
  status: string;
  vehicle?: string;
  scheduledDate: string;
  timeSlot: { startTime: string; endTime: string };
  items: { categoryName: string }[];
  expectedWeight?: string;
  actualAmount?: number;
  createdAt: string;
}

const PAGE_SIZE = 20;

async function fetchPickupPage(
  page: number
): Promise<{ list: HistoryPickup[]; total: number }> {
  const res = await fetch(`/api/pickups?page=${page}&limit=${PAGE_SIZE}`, {
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (res.status === 401) {
    throw new Error("Please log in to view your pickups.");
  }
  if (!res.ok || !json?.success) {
    throw new Error(json?.message || "Failed to load pickup history.");
  }
  return {
    list: (json.data?.pickups ?? []) as HistoryPickup[],
    total: (json.data?.pagination?.total ?? 0) as number,
  };
}

function vehicleLabel(vehicle?: string): string {
  if (!vehicle) return "—";
  const option = VEHICLE_OPTIONS.find((v) => v.id === vehicle);
  return option ? `${option.name} · ${option.label}` : vehicle;
}

function HistoryCard({
  pickup,
  current = false,
}: {
  pickup: HistoryPickup;
  current?: boolean;
}) {
  const badge = getStatusBadge(pickup.status);
  const completed = isCompletedStatus(pickup.status);
  const cancelled = isCancelledStatus(pickup.status);

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md",
        current
          ? "border-primary/40 ring-1 ring-primary/10"
          : "border-border",
        cancelled && "bg-muted-light/40"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-lg font-bold text-primary">{pickup.pickupId}</p>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
            badge.className
          )}
        >
          {completed && <CheckCircle className="h-3 w-3" aria-hidden="true" />}
          {cancelled && <XCircle className="h-3 w-3" aria-hidden="true" />}
          {badge.label}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm text-muted">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="font-medium text-foreground">
            {formatDateShort(pickup.scheduledDate)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {formatTime12(pickup.timeSlot.startTime)} –{" "}
            {formatTime12(pickup.timeSlot.endTime)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{vehicleLabel(pickup.vehicle)}</span>
        </div>
        {pickup.expectedWeight && (
          <div className="flex items-center gap-2">
            <Weight className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{pickup.expectedWeight}</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {pickup.items.slice(0, 6).map((item, i) => (
          <span
            key={i}
            className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-medium text-primary"
          >
            {item.categoryName}
          </span>
        ))}
        {pickup.items.length > 6 && (
          <span className="rounded-full bg-muted-light px-2.5 py-0.5 text-xs text-muted">
            +{pickup.items.length - 6}
          </span>
        )}
      </div>

      {completed && typeof pickup.actualAmount === "number" && pickup.actualAmount > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-primary-light px-3 py-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Actual Amount
          </span>
          <span className="text-sm font-bold text-primary">
            ₹{pickup.actualAmount}
          </span>
        </div>
      )}

      <div className="mt-auto pt-4">
        <Link
          href={`/pickup/${pickup.pickupId}`}
          className={cn(
            "block w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            current
              ? "bg-primary text-white hover:bg-primary-dark"
              : "border border-border text-foreground hover:bg-muted-light"
          )}
        >
          {current ? "View Pickup Status" : "View Status"}
        </Link>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      <span className="rounded-full bg-muted-light px-2.5 py-0.5 text-xs font-semibold text-muted">
        {count}
      </span>
    </div>
  );
}

export default function PickupHistoryPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [pickups, setPickups] = useState<HistoryPickup[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback((page: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);

    fetchPickupPage(page)
      .then(({ list, total: totalCount }) => {
        setPickups((prev) => (append ? [...prev, ...list] : list));
        setTotal(totalCount);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        if (!append) setPickups([]);
      })
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  }, []);

  useEffect(() => {
    if (!user || user.role !== "user") return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { list, total: totalCount } = await fetchPickupPage(1);
        if (cancelled) return;
        setPickups(list);
        setTotal(totalCount);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setPickups([]);
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, reloadKey]);

  const retry = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const { current, restActive, completed, cancelled } = useMemo(() => {
    const active = pickups.filter((p) => isActiveStatus(p.status));
    return {
      current: active[0] ?? null,
      restActive: active.slice(1),
      completed: pickups.filter((p) => isCompletedStatus(p.status)),
      cancelled: pickups.filter((p) => isCancelledStatus(p.status)),
    };
  }, [pickups]);

  const renderAuthGate = () => {
    if (authLoading) {
      return (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-12 text-sm text-muted shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          Checking your session…
        </div>
      );
    }
    if (!user) {
      return (
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <ShieldAlert className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-foreground">
            Login to view pickup history
          </h2>
          <p className="mt-2 text-sm text-muted">
            Track and review all your scrap pickups in one place.
          </p>
          <div className="mt-6">
            <Link
              href="/login"
              className="rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Login / Signup
            </Link>
          </div>
        </div>
      );
    }
    if (user.role !== "user") {
      return (
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <ShieldAlert className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-foreground">
            Customer accounts only
          </h2>
          <div className="mt-6">
            <Link
              href={user.role === "admin" ? "/admin" : "/collector"}
              className="rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      );
    }
    return null;
  };

  const authGate = renderAuthGate();
  const isEmpty =
    !loading && !error && pickups.length === 0 && total === 0;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {authGate ? (
          authGate
        ) : (
          <>
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Pickup History
                </h1>
                <p className="mt-1 text-sm text-muted">
                  All your scrap pickups — current, completed and cancelled.
                </p>
              </div>
              <Link
                href="/pickup"
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <Activity className="mr-2 inline h-4 w-4" aria-hidden="true" />
                Schedule Pickup
              </Link>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-12 text-sm text-muted shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                Loading your pickups…
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
                </div>
                <p className="mt-4 text-sm text-muted">{error}</p>
                <button
                  type="button"
                  onClick={retry}
                  className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && isEmpty && (
              <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <History className="h-7 w-7 text-primary" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-xl font-bold text-foreground">
                  No pickups yet
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                  Schedule your first scrap pickup and it will appear here.
                </p>
                <Link
                  href="/pickup"
                  className="mt-6 inline-block rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  Schedule Pickup
                </Link>
              </div>
            )}

            {/* Content */}
            {!loading && !error && !isEmpty && (
              <div className="space-y-10">
                {/* Current pickup — prominent */}
                {current && (
                  <section>
                    <SectionHeader title="Current Pickup" count={1} />
                    <HistoryCard pickup={current} current />
                  </section>
                )}

                {restActive.length > 0 && (
                  <section>
                    <SectionHeader
                      title="Active Pickups"
                      count={restActive.length}
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {restActive.map((p) => (
                        <HistoryCard key={p.pickupId} pickup={p} />
                      ))}
                    </div>
                  </section>
                )}

                {completed.length > 0 && (
                  <section>
                    <SectionHeader
                      title="Completed Pickups"
                      count={completed.length}
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {completed.map((p) => (
                        <HistoryCard key={p.pickupId} pickup={p} />
                      ))}
                    </div>
                  </section>
                )}

                {cancelled.length > 0 && (
                  <section>
                    <SectionHeader
                      title="Cancelled Pickups"
                      count={cancelled.length}
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {cancelled.map((p) => (
                        <HistoryCard key={p.pickupId} pickup={p} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Load more */}
                {pickups.length < total && (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        const nextPage =
                          Math.floor(pickups.length / PAGE_SIZE) + 1;
                        load(nextPage, true);
                      }}
                      disabled={loadingMore}
                      className="rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted-light focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                    >
                      {loadingMore ? "Loading…" : "Load More"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
