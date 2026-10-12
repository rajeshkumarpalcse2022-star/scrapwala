"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCheck,
  Loader2,
  MapPin,
  Phone,
  PhoneCall,
  RefreshCw,
  Search,
} from "lucide-react";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { refreshUnseenCallbackCount } from "@/hooks/useUnseenCallbackCount";
import {
  CALLBACK_REASON_LABELS,
  CALLBACK_STATUS_LABELS,
  type CallbackReason,
  type CallbackStatus,
} from "@/lib/validations/callback";

interface CallbackItem {
  id: string;
  requestId: string;
  name: string;
  phone: string;
  reasonType: CallbackReason;
  customReason?: string | null;
  address?: string | null;
  status: CallbackStatus;
  seenAt: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700",
};

const STATUS_OPTIONS = Object.keys(CALLBACK_STATUS_LABELS) as CallbackStatus[];

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  ...STATUS_OPTIONS.map((status) => ({
    value: status,
    label: CALLBACK_STATUS_LABELS[status],
  })),
];

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function reasonLabel(item: CallbackItem): string {
  const base = CALLBACK_REASON_LABELS[item.reasonType] || item.reasonType;
  if (item.reasonType === "something_else" && item.customReason) {
    return `${base}: ${item.customReason}`;
  }
  return base;
}

export default function AdminCallbacksPage() {
  const router = useRouter();
  const [items, setItems] = useState<CallbackItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const seenAllSentRef = useRef(false);

  const refreshLists = useCallback(() => setReloadKey((key) => key + 1), []);

  const flash = useCallback((message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 4000);
  }, []);

  // Debounced search (resets to the first page).
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "20",
        });
        if (statusFilter) params.set("status", statusFilter);
        if (debouncedSearch) params.set("search", debouncedSearch);

        const res = await fetch(`/api/admin/callbacks?${params}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (cancelled) return;

        if (res.status === 401) {
          router.push("/");
          return;
        }
        if (res.status === 403) {
          setLoadError("Admin access required.");
          return;
        }
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || "Failed to load call requests");
        }

        setItems(json.data?.items || []);
        setPagination(
          json.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 }
        );
        setLoadError(null);

        // Opening this section means the admin has seen the pending
        // requests — clear the sidebar red badge once per visit.
        if (!seenAllSentRef.current) {
          seenAllSentRef.current = true;
          fetch("/api/admin/callbacks/seen-all", { method: "PATCH" })
            .then(() => refreshUnseenCallbackCount())
            .catch(() => {
              // Badge simply stays until the next successful refresh.
            });
        }
      } catch (err) {
        if (cancelled) return;
        setItems([]);
        setLoadError(
          err instanceof Error ? err.message : "Unable to load call requests."
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [page, statusFilter, debouncedSearch, reloadKey, router]);

  const retry = () => {
    setIsLoading(true);
    setLoadError(null);
    setReloadKey((key) => key + 1);
  };

  const handleStatusChange = async (item: CallbackItem, status: CallbackStatus) => {
    setUpdatingId(item.id);
    setPageError(null);
    try {
      const res = await fetch(`/api/admin/callbacks/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to update request");
      }
      flash(`Call request ${item.requestId} marked as ${CALLBACK_STATUS_LABELS[status].toLowerCase()}`);
      refreshLists();
    } catch (err) {
      setPageError(
        err instanceof Error ? err.message : "Failed to update request"
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMarkAllSeen = async () => {
    try {
      const res = await fetch("/api/admin/callbacks/seen-all", {
        method: "PATCH",
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to mark requests as seen");
      }
      flash("All call requests marked as seen");
      refreshUnseenCallbackCount();
      refreshLists();
    } catch (err) {
      setPageError(
        err instanceof Error ? err.message : "Failed to mark requests as seen"
      );
    }
  };

  const selectTab = (value: string) => {
    setIsLoading(true);
    setStatusFilter(value);
    setPage(1);
  };

  const unseenCount = useMemo(
    () => items.filter((item) => !item.seenAt).length,
    [items]
  );

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Requests</h1>
          <p className="mt-1 text-sm text-gray-500">
            Callback requests submitted by customers from the website.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMarkAllSeen}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            Mark all seen
          </button>
          <button
            type="button"
            onClick={retry}
            aria-label="Refresh"
            className="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {notice && (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
          {notice}
        </p>
      )}
      {pageError && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700"
        >
          {pageError}
        </p>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value || "all"}
              type="button"
              onClick={() => selectTab(tab.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === tab.value
                  ? "bg-primary text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-full lg:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone or ID…"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3" role="status" aria-label="Loading call requests">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {/* Error */}
      {!isLoading && loadError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 py-10 text-center">
          <p className="text-sm font-semibold text-red-700">{loadError}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !loadError && items.length === 0 && (
        <AdminEmptyState
          title="No call requests"
          description="When customers request a callback from the website, they will appear here."
          icon={PhoneCall}
        />
      )}

      {/* Desktop table */}
      {!isLoading && !loadError && items.length > 0 && (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Request</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Reason</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className={
                      item.seenAt
                        ? "bg-white transition-colors hover:bg-gray-50"
                        : "bg-blue-50/60"
                    }
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-gray-900">
                        {item.requestId}
                      </span>
                      {!item.seenAt && (
                        <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-red-500 align-middle" aria-label="Unseen" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <a
                        href={`tel:+91${item.phone}`}
                        className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Phone className="h-3 w-3" aria-hidden="true" />
                        +91 {item.phone}
                      </a>
                    </td>
                    <td className="max-w-[220px] px-4 py-3">
                      <p className="truncate text-gray-900" title={reasonLabel(item)}>
                        {reasonLabel(item)}
                      </p>
                    </td>
                    <td className="max-w-[180px] px-4 py-3">
                      {item.address ? (
                        <p
                          className="flex items-start gap-1 truncate text-xs text-gray-500"
                          title={item.address}
                        >
                          <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                          {item.address}
                        </p>
                      ) : (
                        <span className="text-xs text-gray-400">Not captured</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AdminStatusBadge
                          status={item.status}
                          colors={STATUS_COLORS}
                          labels={CALLBACK_STATUS_LABELS}
                        />
                        <select
                          value={item.status}
                          onChange={(e) =>
                            handleStatusChange(item, e.target.value as CallbackStatus)
                          }
                          disabled={updatingId === item.id}
                          aria-label={`Change status for ${item.requestId}`}
                          className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:border-primary focus:outline-none disabled:opacity-50"
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {CALLBACK_STATUS_LABELS[status]}
                            </option>
                          ))}
                        </select>
                        {updatingId === item.id && (
                          <Loader2
                            className="h-3.5 w-3.5 animate-spin text-primary"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                      {formatDate(item.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {items.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-4 ${
                  item.seenAt
                    ? "border-gray-200 bg-white"
                    : "border-blue-200 bg-blue-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-mono text-xs font-semibold text-gray-900">
                      {item.requestId}
                      {!item.seenAt && (
                        <span
                          className="inline-flex h-2 w-2 rounded-full bg-red-500"
                          aria-label="Unseen"
                        />
                      )}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-gray-900">
                      {item.name}
                    </p>
                    <a
                      href={`tel:+91${item.phone}`}
                      className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Phone className="h-3 w-3" aria-hidden="true" />
                      +91 {item.phone}
                    </a>
                  </div>
                  <AdminStatusBadge
                    status={item.status}
                    colors={STATUS_COLORS}
                    labels={CALLBACK_STATUS_LABELS}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-700">{reasonLabel(item)}</p>
                {item.address && (
                  <p className="mt-1 flex items-start gap-1 text-xs text-gray-500">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="line-clamp-2">{item.address}</span>
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-gray-400">
                    {formatDate(item.createdAt)}
                  </span>
                  <select
                    value={item.status}
                    onChange={(e) =>
                      handleStatusChange(item, e.target.value as CallbackStatus)
                    }
                    disabled={updatingId === item.id}
                    aria-label={`Change status for ${item.requestId}`}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700 focus:border-primary focus:outline-none disabled:opacity-50"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {CALLBACK_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages} ·{" "}
                {pagination.total} request{pagination.total === 1 ? "" : "s"}
                {unseenCount > 0 && (
                  <span className="ml-2 text-red-600">
                    ({unseenCount} unseen on this page)
                  </span>
                )}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
