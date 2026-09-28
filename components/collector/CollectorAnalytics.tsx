"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, PieChart, RefreshCw } from "lucide-react";

type Period = "weekly" | "monthly" | "yearly";

interface TrendPoint {
  label: string;
  count: number;
}

interface StatusPoint {
  status: string;
  label: string;
  count: number;
  percentage: number;
}

interface AnalyticsData {
  period: Period;
  rangeLabel: string;
  trend: TrendPoint[];
  status: StatusPoint[];
  total: number;
}

const PERIODS: Array<{ id: Period; label: string }> = [
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

/**
 * Solid variants of the existing ScrapWala status hue families
 * (see STATUS_COLORS in lib/constants/collectorDemoData.ts).
 */
const STATUS_SOLID: Record<string, string> = {
  scheduled: "#64748b",
  assigned: "#3b82f6",
  accepted: "#eab308",
  on_the_way: "#6366f1",
  arrived: "#a855f7",
  weighing: "#f97316",
  payment_pending: "#f59e0b",
  completed: "#10b981",
  cancelled: "#ef4444",
};

const RING_RADIUS = 50;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function statusColor(status: string): string {
  return STATUS_SOLID[status] ?? "#94a3b8";
}

function shouldShowLabel(index: number, length: number): boolean {
  return index % 5 === 0 || index === length - 1;
}

/**
 * Per-card analytics fetch. Each chart owns its own period + request state so
 * the Weekly/Monthly/Yearly selectors never affect the other card.
 */
function useAnalytics(period: Period) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchAnalytics() {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/collector/analytics?period=${period}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (cancelled) return;
        if (res.ok && json?.success && json?.data) {
          setData(json.data as AnalyticsData);
        } else {
          setError(true);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAnalytics();
    return () => {
      cancelled = true;
    };
  }, [period, reloadKey]);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  return {
    data,
    loading,
    error,
    retry,
    initialLoading: loading && data === null,
    refreshing: loading && data !== null,
  };
}

type CardState = ReturnType<typeof useAnalytics>;

interface CardShellProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  period: Period;
  onPeriodChange: (period: Period) => void;
  state: CardState;
  skeleton: React.ReactNode;
  empty: React.ReactNode;
  chart: (data: AnalyticsData, refreshing: boolean) => React.ReactNode;
}

function CardShell({
  icon,
  title,
  subtitle,
  period,
  onPeriodChange,
  state,
  skeleton,
  empty,
  chart,
}: CardShellProps) {
  const { data, error, initialLoading, refreshing, retry } = state;

  let body: React.ReactNode = null;
  if (error) {
    body = <ChartErrorState onRetry={retry} />;
  } else if (initialLoading) {
    body = skeleton;
  } else if (data && data.total === 0) {
    body = empty;
  } else if (data) {
    body = (
      <div className={refreshing ? "opacity-60 transition-opacity" : "transition-opacity"}>
        {chart(data, refreshing)}
      </div>
    );
  }

  return (
    <section className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        {data && data.total > 0 && (
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
            {data.rangeLabel}
          </span>
        )}
      </div>

      <div className="mt-5 flex-1">{body}</div>

      <div
        className="mt-5 flex gap-1 rounded-xl bg-emerald-50 p-1"
        role="group"
        aria-label={`${title} period`}
      >
        {PERIODS.map((option) => {
          const active = option.id === period;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onPeriodChange(option.id)}
              className={`min-w-[76px] flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                active
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-emerald-700/70 hover:bg-emerald-100/70 hover:text-emerald-800"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TrendSkeleton() {
  const heights = ["h-1/4", "h-2/5", "h-3/5", "h-1/3", "h-4/5", "h-2/5", "h-1/2"];
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="flex h-44 items-end gap-2">
        {heights.map((height, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t-md bg-gray-200 ${height}`}
          />
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {heights.map((_, i) => (
          <div key={i} className="h-3 flex-1 rounded bg-gray-100" />
        ))}
      </div>
      <div className="mt-5 h-9 rounded-xl bg-gray-100" />
    </div>
  );
}

function StatusSkeleton() {
  return (
    <div className="flex animate-pulse flex-col items-center gap-4 sm:flex-row" aria-hidden="true">
      <div className="h-36 w-36 shrink-0 rounded-full border-[16px] border-gray-200" />
      <div className="w-full flex-1 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-gray-200" />
            <div className="h-3.5 flex-1 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-44 flex-col items-center justify-center gap-3 text-center">
      <p className="text-sm text-slate-500">Unable to load pickup analytics.</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        Retry
      </button>
    </div>
  );
}

function TrendChart({ trend }: { trend: TrendPoint[] }) {
  const max = Math.max(...trend.map((point) => point.count), 0);
  const middleLabel = max >= 2 ? Math.max(Math.ceil(max / 2), 1) : null;
  const denseLabels = trend.length > 12;
  const showValues = trend.length <= 12;

  return (
    <div className="chart-fade">
      <div className="relative h-44 pl-6">
        {[1, 0.5, 0].map((fraction) => (
          <div
            key={fraction}
            className={`absolute left-6 right-0 ${
              fraction === 0
                ? "border-t border-slate-200"
                : "border-t border-dashed border-slate-100"
            }`}
            style={{ bottom: `${fraction * 100}%` }}
          />
        ))}
        <span
          className="absolute left-0 top-0 text-[9px] font-medium text-slate-400"
          style={{ transform: "translateY(-50%)" }}
        >
          {max}
        </span>
        {middleLabel !== null && (
          <span
            className="absolute left-0 text-[9px] font-medium text-slate-400"
            style={{ bottom: "50%", transform: "translateY(50%)" }}
          >
            {middleLabel}
          </span>
        )}
        <span className="absolute bottom-0 left-0 text-[9px] font-medium text-slate-400">
          0
        </span>

        <div className="absolute inset-y-0 left-6 right-0 flex items-end gap-1.5">
          {trend.map((point, index) => {
            const barHeight =
              point.count > 0 ? Math.max((point.count / max) * 100, 5) : 0;
            const isPeak = max > 0 && point.count === max;
            return (
              <div
                key={`${point.label}-${index}`}
                className="relative flex h-full min-w-0 flex-1 items-end"
                title={`${point.label}: ${point.count}`}
              >
                {showValues && point.count > 0 && (
                  <span
                    className="pointer-events-none absolute inset-x-0 text-center text-[9px] font-bold text-emerald-600"
                    style={{ bottom: `calc(${barHeight}% + 3px)` }}
                  >
                    {point.count}
                  </span>
                )}
                <div
                  className={`bar-grow w-full rounded-t-md transition-colors ${
                    point.count > 0
                      ? isPeak
                        ? "bg-gradient-to-t from-emerald-500 to-emerald-600 motion-safe:hover:from-emerald-600 motion-safe:hover:to-emerald-700"
                        : "bg-gradient-to-t from-emerald-400 to-emerald-500 motion-safe:hover:from-emerald-500 motion-safe:hover:to-emerald-600"
                      : "rounded-t-sm bg-slate-200/80"
                  }`}
                  style={{
                    height: point.count > 0 ? `${barHeight}%` : "3px",
                    animationDelay: `${Math.min(index * 25, 400)}ms`,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex gap-1.5 pl-6">
        {trend.map((point, index) => (
          <div
            key={`${point.label}-${index}`}
            className={`min-w-0 flex-1 truncate text-center text-[10px] ${
              max > 0 && point.count === max
                ? "font-semibold text-emerald-600"
                : "text-slate-500"
            }`}
          >
            {!denseLabels || shouldShowLabel(index, trend.length)
              ? point.label
              : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusDonut({
  status,
  total,
}: {
  status: StatusPoint[];
  total: number;
}) {
  const segments = status.map((entry, index) => {
    const length = (entry.count / total) * RING_CIRCUMFERENCE;
    const before = status
      .slice(0, index)
      .reduce(
        (sum, prev) => sum + (prev.count / total) * RING_CIRCUMFERENCE,
        0
      );
    const gap = status.length > 1 ? Math.min(3, length * 0.12) : 0;
    const visible = Math.max(length - gap, 0.75);
    return {
      key: entry.status,
      color: statusColor(entry.status),
      dash: `${visible} ${RING_CIRCUMFERENCE - visible}`,
      offset: -before,
    };
  });

  const topStatus = [...status].sort((a, b) => b.count - a.count)[0];

  return (
    <div className="chart-fade flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full" role="img" aria-label={`Pickup status donut, ${total} total pickups`}>
          <circle
            cx="60"
            cy="60"
            r={RING_RADIUS}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="16"
          />
          {segments.map((segment) => (
            <circle
              key={segment.key}
              cx="60"
              cy="60"
              r={RING_RADIUS}
              fill="none"
              stroke={segment.color}
              strokeWidth="16"
              strokeDasharray={segment.dash}
              strokeDashoffset={segment.offset}
              transform="rotate(-90 60 60)"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
            Total
          </span>
          <span className="text-2xl font-bold text-slate-900">{total}</span>
          {topStatus && (
            <span className="mt-0.5 max-w-[80px] truncate text-[9px] font-medium text-slate-400">
              {topStatus.label}
            </span>
          )}
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-3">
        {status.map((entry) => (
          <li key={entry.status} className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: statusColor(entry.status) }}
                aria-hidden="true"
              />
              <span className="truncate text-slate-600">{entry.label}</span>
              <span className="ml-auto shrink-0 font-semibold text-slate-900">
                {entry.count}
              </span>
              <span className="w-9 shrink-0 text-right text-[11px] text-slate-400">
                {entry.percentage}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="bar-fill h-full rounded-full"
                style={{
                  width: `${entry.percentage}%`,
                  backgroundColor: statusColor(entry.status),
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TrendCard() {
  const [period, setPeriod] = useState<Period>("weekly");
  const state = useAnalytics(period);

  return (
    <CardShell
      icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />}
      title="Pickup Trend"
      subtitle="Total pickups you have handled"
      period={period}
      onPeriodChange={setPeriod}
      state={state}
      skeleton={<TrendSkeleton />}
      empty={
        <div className="flex h-44 flex-col items-center justify-center gap-2 text-center">
          <BarChart3 className="h-8 w-8 text-emerald-200" aria-hidden="true" />
          <p className="text-sm text-slate-500">No pickup activity yet</p>
        </div>
      }
      chart={(data, refreshing) => (
        <TrendChart key={`${period}-${refreshing ? "r" : ""}`} trend={data.trend} />
      )}
    />
  );
}

function StatusCard() {
  const [period, setPeriod] = useState<Period>("weekly");
  const state = useAnalytics(period);

  return (
    <CardShell
      icon={<PieChart className="h-5 w-5" aria-hidden="true" />}
      title="Pickup Status"
      subtitle="Total pickups by current status"
      period={period}
      onPeriodChange={setPeriod}
      state={state}
      skeleton={<StatusSkeleton />}
      empty={
        <div className="flex h-44 flex-col items-center justify-center gap-3 text-center">
          <div
            className="h-24 w-24 rounded-full border-[14px] border-gray-100"
            aria-hidden="true"
          />
          <p className="text-sm text-slate-500">No pickup data available</p>
        </div>
      }
      chart={(data) => (
        <StatusDonut key={period} status={data.status} total={data.total} />
      )}
    />
  );
}

export default function CollectorAnalytics() {
  return (
    <div
      className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2"
      aria-label="Pickup analytics"
    >
      <TrendCard />
      <StatusCard />
    </div>
  );
}
