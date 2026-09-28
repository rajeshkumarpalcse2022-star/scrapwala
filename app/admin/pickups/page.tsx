"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Filter, X, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import {
  PICKUP_STATUS_LABELS,
  PICKUP_STATUS_COLORS,
  type AdminPickupStatus,
} from "@/types/admin";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: {
    items: PickupData[];
    pagination: Pagination;
  };
}

const allStatuses: Array<"all" | AdminPickupStatus> = [
  "all",
  "scheduled",
  "assigned",
  "accepted",
  "on_the_way",
  "arrived",
  "weighing",
  "payment_pending",
  "completed",
  "cancelled",
];

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

function formatAmount(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatAddress(address: PickupAddress): string {
  const parts = [address.houseFlatBuilding, address.streetArea, address.city];
  return parts.filter(Boolean).join(", ");
}

export default function AdminPickupsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<"all" | AdminPickupStatus>("all");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [pickups, setPickups] = useState<PickupData[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("limit", "20");

        if (status !== "all") {
          params.set("status", status);
        }
        if (debouncedSearch) {
          params.set("search", debouncedSearch);
        }
        if (date) {
          params.set("from", date);
          params.set("to", date);
        }

        const response = await fetch(
          `/api/admin/pickups?${params.toString()}`
        );

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
          throw new Error("Failed to fetch pickups");
        }

        const data: ApiResponse = await response.json();

        if (!cancelled) {
          if (data.success) {
            setPickups(data.data.items);
            setPagination(data.data.pagination);
          } else {
            setError(data.message || "Failed to fetch pickups");
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
  }, [page, status, debouncedSearch, date, router, retryCount]);

  const handleStatusChange = (newStatus: "all" | AdminPickupStatus) => {
    setStatus(newStatus);
    setPage(1);
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setDebouncedSearch(search);
  };

  const resetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatus("all");
    setDate("");
    setPage(1);
  };

  const hasFilters = search || status !== "all" || date;

  return (
    <div className="max-w-7xl mx-auto px-4">
      <AdminPageHeader
        title="Pickup Management"
        subtitle="Manage and track all scrap pickup requests."
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ID, customer name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </form>
        <div className="flex gap-3">
          <select
            value={status}
            onChange={(e) =>
              handleStatusChange(e.target.value as "all" | AdminPickupStatus)
            }
            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {allStatuses.map((s) => (
              <option key={s} value={s}>
                {s === "all"
                  ? "All Statuses"
                  : PICKUP_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
              Reset
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl border border-gray-200 bg-white animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      ) : pickups.length === 0 ? (
        <AdminEmptyState
          title="No pickups found"
          description="Try adjusting your search or filter criteria."
          icon={Filter}
        />
      ) : (
        <>
          <div className="mt-6 hidden md:block overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                  <th className="px-4 py-3">Pickup ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Collector</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pickups.map((pickup) => (
                  <tr key={pickup._id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                      {pickup.pickupId}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {pickup.customer?.name ?? "Unknown"}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-gray-600">
                      {formatAddress(pickup.address)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {formatDate(pickup.scheduledDate)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {formatTime(pickup.timeSlot)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {pickup.collector?.name ?? "Unassigned"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                      {formatAmount(pickup.estimatedAmount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <AdminStatusBadge
                        status={pickup.status}
                        colors={PICKUP_STATUS_COLORS}
                        labels={PICKUP_STATUS_LABELS}
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link
                        href={`/admin/pickups/${pickup.pickupId}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-3 md:hidden">
            {pickups.map((pickup) => (
              <div
                key={pickup._id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">
                    {pickup.pickupId}
                  </span>
                  <AdminStatusBadge
                    status={pickup.status}
                    colors={PICKUP_STATUS_COLORS}
                    labels={PICKUP_STATUS_LABELS}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  {pickup.customer?.name ?? "Unknown"}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {formatAddress(pickup.address)}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  <span>{formatDate(pickup.scheduledDate)}</span>
                  <span>{formatTime(pickup.timeSlot)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {pickup.collector?.name ?? "Unassigned"}
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatAmount(pickup.estimatedAmount)}
                  </span>
                </div>
                <Link
                  href={`/admin/pickups/${pickup.pickupId}`}
                  className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="h-4 w-4" />
                  View Details
                </Link>
              </div>
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total} pickups
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-700">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(pagination.totalPages, p + 1))
                  }
                  disabled={page === pagination.totalPages}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
