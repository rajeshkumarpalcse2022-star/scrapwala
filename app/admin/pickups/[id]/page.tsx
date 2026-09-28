"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Package,
  User,
  CreditCard,
  CheckCircle2,
  Circle,
  XCircle,
  ChevronDown,
  Loader2,
} from "lucide-react";
import {
  PICKUP_STATUS_LABELS,
  PICKUP_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  type AdminPickupStatus,
} from "@/types/admin";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminModal from "@/components/admin/AdminModal";
import { reportPickupSeen } from "@/hooks/useUnseenPickupCount";

interface PickupCustomer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  isVerified: boolean;
}

interface PickupCollector {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  isActive: boolean;
}

interface PickupItem {
  category: string;
  categoryName: string;
  rate: number;
  unit: string;
  estimatedWeight: number;
  amount: number;
}

interface PickupAddress {
  fullName: string;
  phone: string;
  houseFlatBuilding: string;
  streetArea: string;
  landmark?: string;
  city: string;
  state: string;
  pinCode: string;
}

interface PickupData {
  _id: string;
  pickupId: string;
  customer: PickupCustomer;
  collector?: PickupCollector | null;
  address: PickupAddress;
  scheduledDate: string;
  timeSlot: { startTime: string; endTime: string };
  status: AdminPickupStatus;
  items: PickupItem[];
  estimatedAmount: number;
  actualAmount: number;
  paymentStatus: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: { pickup: PickupData };
}

interface CollectorUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  collectorId?: string;
  role?: string;
  isActive: boolean;
}

interface CollectorsApiResponse {
  success: boolean;
  message?: string;
  data: { collectors: CollectorUser[] };
}

const timelineSteps: Array<{ key: string; label: string }> = [
  { key: "requested", label: "Requested" },
  { key: "scheduled", label: "Scheduled" },
  { key: "assigned", label: "Assigned" },
  { key: "accepted", label: "Accepted" },
  { key: "on_the_way", label: "On the Way" },
  { key: "arrived", label: "Arrived" },
  { key: "weighing", label: "Weighing" },
  { key: "payment_pending", label: "Payment" },
  { key: "completed", label: "Completed" },
];

const statusOrder: AdminPickupStatus[] = [
  "scheduled",
  "assigned",
  "accepted",
  "on_the_way",
  "arrived",
  "weighing",
  "payment_pending",
  "completed",
];

function getTimelineIndex(status: AdminPickupStatus): number {
  return statusOrder.indexOf(status);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(timeSlot: { startTime: string; endTime: string }): string {
  return `${timeSlot.startTime} - ${timeSlot.endTime}`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AdminPickupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [pickup, setPickup] = useState<PickupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const [collectors, setCollectors] = useState<CollectorUser[]>([]);
  const [loadingCollectors, setLoadingCollectors] = useState(false);
  const [collectorsError, setCollectorsError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);

  const [updatingStatus, setUpdatingStatus] = useState(false);

  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/pickups/${id}`);

        if (cancelled) return;

        if (!response.ok) {
          if (response.status === 401) {
            router.push("/");
            return;
          }
          if (response.status === 403) {
            setError("Admin access required");
            return;
          }
          if (response.status === 404) {
            setError("Pickup not found");
            return;
          }
          throw new Error("Failed to fetch pickup");
        }

        const data: ApiResponse = await response.json();

        if (!cancelled) {
          if (data.success) {
            setPickup(data.data.pickup);
            // Actually opened this pickup's detail: clear its unseen state.
            reportPickupSeen("admin", id);
          } else {
            setError(data.message || "Failed to fetch pickup");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "An error occurred");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const fetchCollectors = async () => {
    setLoadingCollectors(true);
    setCollectorsError(null);
    try {
      const response = await fetch("/api/admin/collectors?limit=100");
      if (!response.ok) {
        throw new Error(
          response.status === 401 || response.status === 403
            ? "Not authorized to load collectors."
            : "Failed to load collectors."
        );
      }
      const data: CollectorsApiResponse = await response.json();
      if (data.success && Array.isArray(data.data?.collectors)) {
        // Only active collectors are assignable.
        setCollectors(
          data.data.collectors.filter((c) => c.isActive !== false)
        );
      } else {
        throw new Error(data.message || "Failed to load collectors.");
      }
    } catch (err) {
      setCollectors([]);
      setCollectorsError(
        err instanceof Error ? err.message : "Unable to load collectors."
      );
    } finally {
      setLoadingCollectors(false);
    }
  };

  const handleAssignCollector = async (collectorId: string) => {
    setAssigning(collectorId);
    try {
      const response = await fetch(`/api/admin/pickups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectorId }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.message || "Failed to assign collector");
        return;
      }

      const data: ApiResponse = await response.json();
      if (data.success && data.data?.pickup) {
        setPickup(data.data.pickup);
        setAssignModalOpen(false);
      }
    } catch {
      alert("Failed to assign collector");
    } finally {
      setAssigning(null);
    }
  };

  const handleStatusChange = async (newStatus: AdminPickupStatus) => {
    setUpdatingStatus(true);
    setStatusDropdownOpen(false);

    try {
      const response = await fetch(`/api/admin/pickups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.message || "Failed to update status");
        return;
      }

      const data: ApiResponse = await response.json();
      if (data.success && data.data?.pickup) {
        setPickup(data.data.pickup);
      }
    } catch {
      alert("Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCancelPickup = async () => {
    await handleStatusChange("cancelled");
    setConfirmCancel(false);
  };

  const openAssignModal = () => {
    setAssignModalOpen(true);
    if (collectors.length === 0) {
      fetchCollectors();
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 pb-24">
        <Link
          href="/admin/pickups"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Pickups
        </Link>
        <div className="mt-8 space-y-6">
          <div className="h-8 w-48 rounded-lg bg-gray-200 animate-pulse" />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-64 rounded-xl bg-gray-200 animate-pulse" />
            <div className="h-64 rounded-xl bg-gray-200 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !pickup) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <Link
          href="/admin/pickups"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Pickups
        </Link>
        <div className="mt-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {error || "Pickup not found"}
          </h1>
          <p className="mt-2 text-gray-500">
            {error === "Pickup not found"
              ? `The pickup "${id}" does not exist.`
              : "Something went wrong while loading the pickup."}
          </p>
          <Link
            href="/admin/pickups"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Pickups
          </Link>
        </div>
      </div>
    );
  }

  const currentStepIndex = getTimelineIndex(pickup.status);

  const estimatedQuantity = pickup.items
    .map((item) => `${item.estimatedWeight} ${item.unit}`)
    .join(", ");

  return (
    <div className="max-w-7xl mx-auto px-4 pb-24">
      <Link
        href="/admin/pickups"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Pickups
      </Link>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {pickup.pickupId}
            </h1>
            <AdminStatusBadge
              status={pickup.status}
              colors={PICKUP_STATUS_COLORS}
              labels={PICKUP_STATUS_LABELS}
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Created {formatDate(pickup.createdAt)}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase text-gray-500">
              <User className="h-4 w-4" />
              Customer Info
            </h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Name</span>
                <span className="text-sm font-medium text-gray-900">
                  {pickup.customer?.name ?? pickup.address.fullName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Phone</span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                  {pickup.customer?.phone ?? pickup.address.phone}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Email</span>
                <span className="text-sm font-medium text-gray-900">
                  {pickup.customer?.email ?? "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Address</span>
                <span className="flex items-center gap-1.5 text-right text-sm text-gray-900">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  {pickup.address.houseFlatBuilding}, {pickup.address.streetArea}, {pickup.address.city}, {pickup.address.state} - {pickup.address.pinCode}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase text-gray-500">
              <Package className="h-4 w-4" />
              Pickup Info
            </h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Date</span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  {formatDate(pickup.scheduledDate)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Time</span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  {formatTime(pickup.timeSlot)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Categories</span>
                <div className="flex flex-wrap gap-1.5">
                  {pickup.items.map((item, idx) => (
                    <span
                      key={idx}
                      className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                    >
                      {item.categoryName}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Est. Quantity
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {estimatedQuantity || "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Est. Amount</span>
                <span className="text-sm font-medium text-gray-900">
                  ₹{pickup.estimatedAmount.toLocaleString("en-IN")}
                </span>
              </div>
              {pickup.notes && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Notes</span>
                  <span className="text-sm text-gray-700 max-w-[200px] truncate">
                    {pickup.notes}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase text-gray-500">
              <User className="h-4 w-4" />
              Collector Info
            </h2>
            <div className="mt-4">
              {pickup.collector ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                    {getInitials(pickup.collector.name)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {pickup.collector.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {pickup.collector.phone}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Unassigned</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase text-gray-500">
              <CreditCard className="h-4 w-4" />
              Payment Info
            </h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <AdminStatusBadge
                  status={pickup.paymentStatus ?? "pending"}
                  colors={PAYMENT_STATUS_COLORS}
                  labels={PAYMENT_STATUS_LABELS}
                />
              </div>
              {pickup.paymentMethod && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Method</span>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {pickup.paymentMethod.replace("_", " ")}
                  </span>
                </div>
              )}
              {pickup.actualAmount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Final Amount</span>
                  <span className="text-sm font-bold text-gray-900">
                    ₹{pickup.actualAmount.toLocaleString("en-IN")}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-semibold uppercase text-gray-500">
              Pickup Timeline
            </h2>
            <div className="mt-4 space-y-0">
              {timelineSteps.map((step, idx) => {
                const isDone = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <div key={step.key} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      {isDone ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-300" />
                      )}
                      {idx < timelineSteps.length - 1 && (
                        <div
                          className={`w-0.5 flex-1 ${
                            idx < currentStepIndex
                              ? "bg-emerald-300"
                              : "bg-gray-200"
                          }`}
                        />
                      )}
                    </div>
                    <div className="pb-6">
                      <span
                        className={`text-sm ${
                          isCurrent
                            ? "font-semibold text-emerald-600"
                            : isDone
                            ? "font-medium text-gray-900"
                            : "text-gray-400"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Admin Actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={openAssignModal}
            disabled={pickup.status === "completed" || pickup.status === "cancelled"}
            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pickup.collector ? "Reassign Collector" : "Assign Collector"}
          </button>

          <div className="relative">
            <button
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              disabled={updatingStatus || pickup.status === "completed" || pickup.status === "cancelled"}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updatingStatus ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              Change Status
            </button>
            {statusDropdownOpen && (
              <div className="absolute left-0 z-20 mt-2 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                {statusOrder.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                      pickup.status === s
                        ? "font-medium text-emerald-600"
                        : "text-gray-700"
                    }`}
                  >
                    {PICKUP_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {pickup.status !== "cancelled" && pickup.status !== "completed" && (
            <button
              onClick={() => setConfirmCancel(true)}
              className="rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Cancel Pickup
            </button>
          )}
        </div>
      </section>

      <AdminModal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Collector"
      >
        <div className="space-y-3">
          {loadingCollectors ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : collectorsError ? (
            <div className="py-8 text-center">
              <p className="text-sm text-red-600">{collectorsError}</p>
              <button
                onClick={fetchCollectors}
                className="mt-3 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Retry
              </button>
            </div>
          ) : collectors.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No active collectors found.
            </p>
          ) : (
            collectors.map((collector) => (
              <button
                key={collector.id}
                onClick={() => handleAssignCollector(collector.id)}
                disabled={assigning === collector.id}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50 disabled:opacity-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                  {getInitials(collector.name)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {collector.name}
                    {collector.collectorId && (
                      <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                        {collector.collectorId}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">
                    {collector.phone}
                    {collector.email ? ` · ${collector.email}` : ""}
                  </p>
                </div>
                {assigning === collector.id && (
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                )}
              </button>
            ))
          )}
        </div>
      </AdminModal>

      <AdminModal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancel Pickup"
      >
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Are you sure you want to cancel pickup{" "}
            <strong>{pickup.pickupId}</strong>? This action cannot be undone.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => setConfirmCancel(false)}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Keep Pickup
            </button>
            <button
              onClick={handleCancelPickup}
              className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Yes, Cancel
            </button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
