"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  IndianRupee,
  MapPin,
  Package,
  Percent,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  REPORT_PERIODS,
  type AdminReport,
  type ReportPeriod,
} from "@/types/report";

const STATUS_HEX: Record<string, string> = {
  scheduled: "#3b82f6",
  assigned: "#6366f1",
  accepted: "#eab308",
  on_the_way: "#a855f7",
  arrived: "#f97316",
  weighing: "#f59e0b",
  payment_pending: "#f43f5e",
  completed: "#10b981",
  cancelled: "#ef4444",
};

const CATEGORY_BARS = [
  "from-emerald-500 to-teal-500",
  "from-blue-500 to-cyan-500",
  "from-amber-500 to-orange-500",
  "from-violet-500 to-purple-500",
  "from-rose-500 to-pink-500",
  "from-slate-500 to-slate-400",
];

const RANK_STYLES = [
  "bg-amber-100 text-amber-700 ring-amber-200",
  "bg-slate-100 text-slate-600 ring-slate-200",
  "bg-orange-100 text-orange-700 ring-orange-200",
];

type Tone = "emerald" | "blue" | "amber" | "rose" | "violet";

const TONE_STYLES: Record<Tone, string> = {
  emerald: "from-emerald-500 to-teal-500",
  blue: "from-blue-500 to-cyan-500",
  amber: "from-amber-500 to-orange-500",
  rose: "from-rose-500 to-pink-500",
  violet: "from-violet-500 to-purple-500",
};

function formatCurrency(value: number): string {
  return `₹${Math.round(value || 0).toLocaleString("en-IN")}`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function DeltaBadge({
  value,
  suffix = "%",
  label,
}: {
  value: number | null;
  suffix?: string;
  label: string;
}) {
  if (value === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
        {label} <span className="text-gray-400">—</span>
      </span>
    );
  }

  const positive = value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        positive
          ? "bg-emerald-50 text-emerald-700"
          : "bg-rose-50 text-rose-700"
      }`}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(value).toFixed(1)}
      {suffix}
      <span className="font-normal opacity-70">{label}</span>
    </span>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  delta,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: Tone;
  delta?: ReactNode;
}) {
  return (
    <div className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 sm:text-xs">
            {label}
          </p>
          <p className="mt-1.5 truncate text-xl font-bold text-gray-900 sm:mt-2 sm:text-2xl">
            {value}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm sm:h-11 sm:w-11 ${TONE_STYLES[tone]}`}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 sm:mt-3 sm:gap-2">
        {delta}
        <span className="text-[11px] text-gray-500 sm:text-xs">{hint}</span>
      </div>
    </div>
  );
}

function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/60 text-center">
      <BarChart3 className="h-8 w-8 text-gray-300" />
      <p className="mt-2 max-w-xs text-sm text-gray-500">{message}</p>
    </div>
  );
}

function PickupTrendChart({ report }: { report: AdminReport }) {
  const { trend } = report;
  const max = Math.max(1, ...trend.map((point) => point.pickups));
  const labelStep = trend.length > 14 ? Math.ceil(trend.length / 7) : 1;
  const total = trend.reduce((sum, point) => sum + point.pickups, 0);

  if (total === 0) {
    return <ChartEmptyState message="No pickups were scheduled in this period." />;
  }

  const minWidth = Math.max(
    240,
    trend.length * (report.trendGranularity === "month" ? 34 : 16)
  );

  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="w-full" style={{ minWidth }}>
        <div className="flex h-56 items-end gap-1.5">
          {trend.map((point) => {
            const height = (point.pickups / max) * 100;
            const completedShare =
              point.pickups > 0 ? (point.completed / point.pickups) * 100 : 0;

            return (
              <div
                key={point.key}
                className="group relative flex h-full flex-1 flex-col justify-end"
                title={`${point.label}: ${point.pickups} pickups (${point.completed} completed)`}
              >
                <div
                  className="relative w-full overflow-hidden rounded-t-md bg-emerald-100 transition group-hover:bg-emerald-200"
                  style={{ height: `${Math.max(height, 3)}%` }}
                >
                  <div
                    className="absolute bottom-0 w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400"
                    style={{ height: `${completedShare}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex gap-1.5">
          {trend.map((point, index) => (
            <span
              key={point.key}
              className="flex-1 truncate text-center text-[10px] text-gray-400"
            >
              {index % labelStep === 0 || index === trend.length - 1
                ? point.shortLabel
                : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function RevenueTrendChart({ report }: { report: AdminReport }) {
  const { trend } = report;
  const max = Math.max(1, ...trend.map((point) => point.revenue));
  const labelStep = trend.length > 14 ? Math.ceil(trend.length / 7) : 1;
  const total = trend.reduce((sum, point) => sum + point.revenue, 0);

  if (total === 0) {
    return (
      <ChartEmptyState message="Revenue appears once pickups are completed." />
    );
  }

  const minWidth = Math.max(
    240,
    trend.length * (report.trendGranularity === "month" ? 34 : 16)
  );

  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="w-full" style={{ minWidth }}>
        <div className="flex h-52 items-end gap-1.5">
          {trend.map((point) => {
            const height = (point.revenue / max) * 100;
            return (
              <div
                key={point.key}
                className="group relative flex h-full flex-1 flex-col justify-end"
                title={`${point.label}: ${formatCurrency(point.revenue)}`}
              >
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-amber-500 to-amber-300 transition group-hover:from-amber-600 group-hover:to-amber-400"
                  style={{ height: `${Math.max(height, 3)}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex gap-1.5">
          {trend.map((point, index) => (
            <span
              key={point.key}
              className="flex-1 truncate text-center text-[10px] text-gray-400"
            >
              {index % labelStep === 0 || index === trend.length - 1
                ? point.shortLabel
                : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusDonut({ report }: { report: AdminReport }) {
  const { status, summary } = report;
  const total = status.reduce((sum, item) => sum + item.count, 0);

  const gradient = useMemo(() => {
    if (total === 0) return "conic-gradient(#e5e7eb 0% 100%)";
    let cursor = 0;
    const segments = status.map((item) => {
      const start = cursor;
      cursor += (item.count / total) * 100;
      return `${STATUS_HEX[item.status] ?? "#94a3b8"} ${start}% ${cursor}%`;
    });
    return `conic-gradient(${segments.join(", ")})`;
  }, [status, total]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-4">
        <div
          className="relative flex h-40 w-40 items-center justify-center rounded-full"
          style={{ background: gradient }}
        >
          <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white shadow-inner">
            <span className="text-2xl font-bold text-gray-900">
              {summary.totalPickups.toLocaleString("en-IN")}
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
              Pickups
            </span>
          </div>
        </div>
        <span className="-mt-2 text-xs text-gray-500">
          {summary.completionRate}% completion rate
        </span>
      </div>

      {status.length > 0 ? (
        <ul className="grid grid-cols-1 gap-x-4 gap-y-2 min-[380px]:grid-cols-2">
          {status.map((item) => (
            <li key={item.status} className="flex items-center gap-2 text-xs">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: STATUS_HEX[item.status] ?? "#94a3b8",
                }}
              />
              <span className="min-w-0 flex-1 truncate text-gray-600">
                {item.label}
              </span>
              <span className="font-semibold text-gray-900">{item.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-sm text-gray-500">
          No pickup status data yet.
        </p>
      )}
    </div>
  );
}

function CategoryBreakdown({ report }: { report: AdminReport }) {
  const { categories } = report;
  const maxAmount = Math.max(1, ...categories.map((item) => item.amount));

  if (categories.length === 0) {
    return (
      <ChartEmptyState message="Scrap category insights appear after the first booking with items." />
    );
  }

  return (
    <ul className="space-y-4">
      {categories.map((category, index) => (
        <li key={category.name} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-gray-800">
              {category.name}
            </span>
            <span className="shrink-0 font-semibold text-gray-900">
              {formatCurrency(category.amount)}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${
                CATEGORY_BARS[index % CATEGORY_BARS.length]
              }`}
              style={{ width: `${Math.max((category.amount / maxAmount) * 100, 2)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-gray-500">
            <span>
              {category.weight.toLocaleString("en-IN")} total weight ·{" "}
              {category.pickups} pickups
            </span>
            <span>{category.percentage}% of value</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CollectorTable({ report }: { report: AdminReport }) {
  const { collectors } = report;

  if (collectors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-12 text-center">
        <Truck className="mx-auto h-8 w-8 text-gray-300" />
        <p className="mt-2 text-sm text-gray-500">
          No collectors have been assigned pickups in this period.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-gray-200 md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Rank</th>
              <th className="px-4 py-3 font-semibold">Collector</th>
              <th className="px-4 py-3 font-semibold">Pickups</th>
              <th className="px-4 py-3 font-semibold">Completed</th>
              <th className="px-4 py-3 font-semibold">Completion</th>
              <th className="px-4 py-3 text-right font-semibold">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {collectors.map((collector, index) => (
              <tr key={collector.id} className="hover:bg-gray-50/70">
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-1 ${
                      RANK_STYLES[index] ??
                      "bg-gray-50 text-gray-500 ring-gray-200"
                    }`}
                  >
                    {index + 1}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                      {getInitials(collector.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">
                        {collector.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {collector.cancelled} cancelled
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{collector.total}</td>
                <td className="px-4 py-3 text-gray-600">
                  {collector.completed}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${collector.completionRate}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600">
                      {collector.completionRate}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                  {formatCurrency(collector.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {collectors.map((collector, index) => (
          <div
            key={collector.id}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                {getInitials(collector.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-900">
                  {collector.name}
                </p>
                <p className="text-xs text-gray-500">
                  #{index + 1} · {collector.completed}/{collector.total} completed
                </p>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {formatCurrency(collector.revenue)}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${collector.completionRate}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function LocationCards({ report }: { report: AdminReport }) {
  const { locations } = report;
  const maxRevenue = Math.max(1, ...locations.map((item) => item.revenue));

  if (locations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-12 text-center">
        <MapPin className="mx-auto h-8 w-8 text-gray-300" />
        <p className="mt-2 text-sm text-gray-500">
          No location data for this period.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {locations.map((location) => {
        const finished = location.total - location.cancelled;
        const rate =
          finished > 0 ? Math.round((location.completed / finished) * 100) : 0;

        return (
          <li
            key={location.city}
            className="rounded-xl border border-gray-200 bg-white p-4 transition hover:border-emerald-200"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <MapPin className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {location.city}
                  </p>
                  <p className="text-xs text-gray-500">
                    {location.total} pickups · {rate}% completed
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-sm font-semibold text-gray-900">
                {formatCurrency(location.revenue)}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                style={{
                  width: `${Math.max(
                    (location.revenue / maxRevenue) * 100,
                    2
                  )}%`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function RecentCompleted({ report }: { report: AdminReport }) {
  const { recentCompleted } = report;

  if (recentCompleted.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-12 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-gray-300" />
        <p className="mt-2 text-sm text-gray-500">
          No completed pickups in this period yet.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {recentCompleted.map((pickup) => (
        <li key={pickup.pickupId}>
          <Link
            href={`/admin/pickups/${pickup.pickupId}`}
            className="group flex items-center gap-3 py-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Package className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900 group-hover:text-emerald-700">
                {pickup.pickupId}
              </p>
              <p className="truncate text-xs text-gray-500">
                {pickup.customerName} · {pickup.city}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(pickup.amount)}
              </p>
              <p className="text-[11px] text-gray-400">
                {formatDate(pickup.date)}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 transition group-hover:text-emerald-500" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-40 animate-pulse rounded-2xl bg-gray-200" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-2xl bg-gray-200"
          />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-80 animate-pulse rounded-2xl bg-gray-200 lg:col-span-2" />
        <div className="h-80 animate-pulse rounded-2xl bg-gray-200" />
      </div>
    </div>
  );
}

export default function AdminReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("30d");
  const [report, setReport] = useState<AdminReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/reports?period=${period}`, {
          signal: controller.signal,
        });
        const json = await response.json();

        if (!response.ok || !json.success) {
          throw new Error(json.message || "Failed to load report");
        }

        setReport(json.data as AdminReport);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error ? err.message : "Failed to load report"
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [period, reloadKey]);

  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);

  const peakDay = useMemo(() => {
    if (!report || report.trend.every((point) => point.pickups === 0)) {
      return null;
    }
    return [...report.trend].sort((a, b) => b.pickups - a.pickups)[0];
  }, [report]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-8 overflow-x-clip">
      <AdminPageHeader
        title="Reports & Analytics"
        subtitle="Live operational insights generated from your pickup data."
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="flex w-full rounded-xl border border-gray-200 bg-white p-1 shadow-sm sm:w-auto">
              {REPORT_PERIODS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPeriod(option.value)}
                  className={`flex-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition sm:flex-none sm:px-3 sm:text-xs ${
                    period === option.value
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        }
      />

      {error && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={refresh}
            className="font-semibold underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      )}

      {!report && loading && <LoadingSkeleton />}

      {report && (
        <>
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-6 text-white shadow-lg sm:p-8">
            <div
              className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl"
              aria-hidden="true"
            />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-emerald-50 backdrop-blur">
                  <Activity className="h-3.5 w-3.5" />
                  {report.rangeLabel}
                </span>
                <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                  Business snapshot
                </h2>
                <p className="mt-1 max-w-xl text-sm text-emerald-100">
                  {report.summary.totalPickups.toLocaleString("en-IN")} pickups
                  scheduled in this window
                  {peakDay
                    ? `, peaking on ${peakDay.label} with ${peakDay.pickups} bookings.`
                    : "."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-emerald-100">
                    <Wallet className="h-3.5 w-3.5" /> Revenue
                  </div>
                  <p className="mt-1 truncate text-lg font-bold sm:text-xl">
                    {formatCurrency(report.summary.revenue)}
                  </p>
                  <DeltaBadge
                    value={percentChange(
                      report.summary.revenue,
                      report.previous.revenue
                    )}
                    label="vs prev"
                  />
                </div>
                <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-emerald-100">
                    <Percent className="h-3.5 w-3.5" /> Completion
                  </div>
                  <p className="mt-1 truncate text-lg font-bold sm:text-xl">
                    {report.summary.completionRate}%
                  </p>
                  <DeltaBadge
                    value={
                      report.summary.completionRate -
                      report.previous.completionRate
                    }
                    suffix=" pts"
                    label="vs prev"
                  />
                </div>
                <div className="col-span-2 rounded-xl bg-white/10 px-4 py-3 backdrop-blur sm:col-span-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-emerald-100">
                    <CircleDollarSign className="h-3.5 w-3.5" /> Avg value
                  </div>
                  <p className="mt-1 truncate text-lg font-bold sm:text-xl">
                    {formatCurrency(report.summary.averageOrderValue)}
                  </p>
                  <DeltaBadge
                    value={percentChange(
                      report.summary.averageOrderValue,
                      report.previous.averageOrderValue
                    )}
                    label="vs prev"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard
              label="Total pickups"
              value={report.summary.totalPickups.toLocaleString("en-IN")}
              hint="scheduled in period"
              icon={Package}
              tone="blue"
              delta={
                <DeltaBadge
                  value={percentChange(
                    report.summary.totalPickups,
                    report.previous.totalPickups
                  )}
                  label="vs prev"
                />
              }
            />
            <StatCard
              label="Completed"
              value={report.summary.completedPickups.toLocaleString("en-IN")}
              hint={`${report.summary.completionRate}% success rate`}
              icon={CheckCircle2}
              tone="emerald"
              delta={
                <DeltaBadge
                  value={percentChange(
                    report.summary.completedPickups,
                    report.previous.completedPickups
                  )}
                  label="vs prev"
                />
              }
            />
            <StatCard
              label="In progress"
              value={report.summary.inProgressPickups.toLocaleString("en-IN")}
              hint="active pipeline"
              icon={Clock}
              tone="amber"
            />
            <StatCard
              label="Cancelled"
              value={report.summary.cancelledPickups.toLocaleString("en-IN")}
              hint="in this period"
              icon={XCircle}
              tone="rose"
            />
          </section>

          <section className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:grid-cols-4">
            {[
              {
                label: "Active customers",
                value: report.summary.activeCustomers.toLocaleString("en-IN"),
                icon: Users,
              },
              {
                label: "Active collectors",
                value: report.summary.activeCollectors.toLocaleString("en-IN"),
                icon: Truck,
              },
              {
                label: "Peak booking day",
                value: peakDay ? peakDay.label : "—",
                icon: TrendingUp,
              },
              {
                label:
                  report.trendGranularity === "day"
                    ? "Avg pickups / day"
                    : "Avg pickups / month",
                value: (
                  report.summary.totalPickups / report.trend.length
                ).toFixed(1),
                icon: BarChart3,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium uppercase tracking-wide text-gray-400">
                      {item.label}
                    </p>
                    <p className="truncate text-sm font-bold text-gray-900">
                      {item.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="grid min-w-0 gap-6 lg:grid-cols-3 [&>*]:min-w-0">
            <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 lg:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Pickup volume
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Scheduled bookings with completed pickups highlighted.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Completed
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-100" />
                    Other
                  </span>
                </div>
              </div>
              <div className="mt-6">
                <PickupTrendChart report={report} />
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
              <h3 className="text-base font-semibold text-gray-900">
                Status breakdown
              </h3>
              <p className="mt-0.5 text-xs text-gray-500">
                Where this period&apos;s pickups stand right now.
              </p>
              <StatusDonut report={report} />
            </div>
          </section>

          <section className="grid min-w-0 gap-6 lg:grid-cols-2 [&>*]:min-w-0">
            <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Revenue trend
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Value of completed pickups per {report.trendGranularity}.
                  </p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  {formatCurrency(report.summary.revenue)}
                </span>
              </div>
              <div className="mt-6">
                <RevenueTrendChart report={report} />
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Top scrap categories
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Ranked by estimated value in this period.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {report.categories.length} materials
                </span>
              </div>
              <div className="mt-5">
                <CategoryBreakdown report={report} />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Collector performance
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  Completed pickups, completion rate and collected value.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                <Award className="h-3.5 w-3.5" />
                Top {Math.min(report.collectors.length, 8)} collectors
              </span>
            </div>
            <div className="mt-5">
              <CollectorTable report={report} />
            </div>
          </section>

          <section className="grid min-w-0 gap-6 lg:grid-cols-5 [&>*]:min-w-0">
            <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 lg:col-span-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Location performance
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Top cities by collected value.
                  </p>
                </div>
                <MapPin className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="mt-5">
                <LocationCards report={report} />
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Recently completed
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Latest finished pickups.
                  </p>
                </div>
                <Link
                  href="/admin/pickups?status=completed"
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  View all
                </Link>
              </div>
              <div className="mt-3">
                <RecentCompleted report={report} />
              </div>
            </div>
          </section>

          <p className="flex flex-wrap items-center gap-2 pb-6 text-xs text-gray-400">
            <IndianRupee className="h-3.5 w-3.5" />
            Live data from the Scrapi database · Last refreshed{" "}
            {new Date(report.generatedAt).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </>
      )}
    </div>
  );
}
