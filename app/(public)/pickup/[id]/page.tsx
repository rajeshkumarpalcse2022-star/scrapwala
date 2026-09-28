"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  MapPin,
  Package,
  Phone,
  ShieldAlert,
  Truck,
  User,
  Weight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import PickupTimeline from "@/components/pickup/PickupTimeline";
import { VEHICLE_OPTIONS } from "@/lib/constants/pickup";
import {
  formatDateFull,
  formatTime12,
  getStatusBadge,
} from "@/lib/utils/pickup-format";
import { cn } from "@/lib/utils";

interface TrackedPickup {
  pickupId: string;
  status: string;
  vehicle?: string;
  scheduledDate: string;
  timeSlot: { startTime: string; endTime: string };
  address: {
    fullName: string;
    phone: string;
    houseFlatBuilding: string;
    streetArea: string;
    landmark?: string;
    city: string;
    state: string;
    pinCode: string;
  };
  items: { categoryName: string }[];
  expectedWeight?: string;
  estimatedAmount: number;
  actualAmount: number;
  paymentStatus: string;
  createdAt: string;
}

export default function PickupTrackingPage() {
  const params = useParams<{ id: string }>();
  const pickupId = params.id;
  const { user, isLoading: authLoading } = useAuth();

  const [pickup, setPickup] = useState<TrackedPickup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!user || user.role !== "user" || !pickupId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/pickups/${encodeURIComponent(pickupId)}`,
          { cache: "no-store" }
        );
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.status === 401) {
          throw new Error("Please log in to view this pickup.");
        }
        if (res.status === 404) {
          throw new Error(
            "Pickup not found, or it doesn't belong to your account."
          );
        }
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || "Failed to load pickup status.");
        }
        setPickup(json.data as TrackedPickup);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setPickup(null);
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, pickupId, reloadKey]);

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
            Login to view pickup status
          </h2>
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
  const badge = pickup ? getStatusBadge(pickup.status) : null;
  const vehicleOption = pickup?.vehicle
    ? VEHICLE_OPTIONS.find((v) => v.id === pickup.vehicle)
    : undefined;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {authGate ? (
          authGate
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Link
                  href="/pickup-history"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted-light focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Back to pickup history"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  History
                </Link>
                <h1 className="text-xl font-bold text-foreground sm:text-2xl">
                  Pickup Tracking
                </h1>
              </div>
              {badge && pickup && (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                    badge.className
                  )}
                >
                  {badge.label}
                </span>
              )}
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-12 text-sm text-muted shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                Loading pickup status…
              </div>
            )}

            {!loading && error && (
              <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
                </div>
                <p className="mt-4 text-sm text-muted">{error}</p>
                <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={load}
                    className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    Retry
                  </button>
                  <Link
                    href="/pickup-history"
                    className="rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted-light focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    Back to History
                  </Link>
                </div>
              </div>
            )}

            {!loading && !error && pickup && (
              <div className="space-y-4">
                {/* Reference card */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted">Pickup Reference</p>
                      <p className="mt-1 text-2xl font-bold text-primary">
                        {pickup.pickupId}
                      </p>
                    </div>
                    {pickup.status === "cancelled" && (
                      <div className="rounded-lg bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive">
                        Pickup Cancelled
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Timeline */}
                  <PickupTimeline status={pickup.status} />

                  {/* Details */}
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-card p-5">
                      <p className="text-sm font-medium text-foreground">
                        Schedule
                      </p>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted">
                          <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>{formatDateFull(pickup.scheduledDate)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted">
                          <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>
                            {formatTime12(pickup.timeSlot.startTime)} –{" "}
                            {formatTime12(pickup.timeSlot.endTime)}
                          </span>
                        </div>
                        {(vehicleOption || pickup.vehicle) && (
                          <div className="flex items-center gap-2 text-sm text-muted">
                            <Truck className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span>
                              {vehicleOption
                                ? `${vehicleOption.name} · ${vehicleOption.label}`
                                : pickup.vehicle}
                            </span>
                          </div>
                        )}
                        {pickup.expectedWeight && (
                          <div className="flex items-center gap-2 text-sm text-muted">
                            <Weight className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span>Expected: {pickup.expectedWeight}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-5">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted" aria-hidden="true" />
                        <p className="text-sm font-medium text-foreground">
                          Scrap Items
                        </p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {pickup.items.map((item, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-primary"
                          >
                            {item.categoryName}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actual amount — only real data from the Pickup model */}
                    {pickup.status === "completed" && pickup.actualAmount > 0 && (
                      <div className="rounded-xl border border-primary/30 bg-primary-light p-5">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm font-medium text-primary">
                            <CheckCircle className="h-4 w-4" aria-hidden="true" />
                            Actual Amount
                          </span>
                          <span className="text-lg font-bold text-primary">
                            ₹{pickup.actualAmount}
                          </span>
                        </div>
                        {pickup.paymentStatus && (
                          <p className="mt-1 text-right text-xs capitalize text-muted">
                            Payment: {pickup.paymentStatus.replace(/_/g, " ")}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="rounded-xl border border-border bg-card p-5">
                      <p className="text-sm font-medium text-foreground">
                        Pickup Address
                      </p>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted">
                          <User className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>{pickup.address.fullName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted">
                          <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>{pickup.address.phone}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-muted">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>
                            {pickup.address.houseFlatBuilding},{" "}
                            {pickup.address.streetArea}, {pickup.address.city},{" "}
                            {pickup.address.state} - {pickup.address.pinCode}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Link
                    href="/pickup-history"
                    className="rounded-lg border border-border px-6 py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    <ArrowLeft className="mr-2 inline h-4 w-4" aria-hidden="true" />
                    Back to History
                  </Link>
                  <Link
                    href="/pickup"
                    className="rounded-lg bg-primary px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    <Activity className="mr-2 inline h-4 w-4" aria-hidden="true" />
                    Schedule a Pickup
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
