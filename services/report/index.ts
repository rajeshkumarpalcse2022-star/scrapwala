import Pickup from "@/models/Pickup";
import User from "@/models/User";
import connectDB from "@/lib/db/mongoose";
import { istDayRange, todayIstKey } from "@/lib/utils/timezone";
import { PICKUP_STATUS_LABELS } from "@/lib/constants/pickup";
import type {
  AdminReport,
  AdminReportCategory,
  AdminReportCollector,
  AdminReportLocation,
  AdminReportPrevious,
  AdminReportStatus,
  AdminReportSummary,
  AdminReportTrendPoint,
  ReportPeriod,
} from "@/types/report";

const DAY_MS = 86_400_000;

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

const STATUS_ORDER = [
  "scheduled",
  "assigned",
  "accepted",
  "on_the_way",
  "arrived",
  "weighing",
  "payment_pending",
  "completed",
  "cancelled",
] as const;

/**
 * Revenue is the value of completed pickups. Weighed pickups carry the final
 * amount; legacy rows without a final amount fall back to the booking estimate
 * so historical revenue is never silently zero.
 */
const REVENUE_EXPRESSION = {
  $cond: [
    { $eq: ["$status", "completed"] },
    {
      $cond: [
        { $gt: [{ $ifNull: ["$actualAmount", 0] }, 0] },
        "$actualAmount",
        { $ifNull: ["$estimatedAmount", 0] },
      ],
    },
    0,
  ],
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function keyFromUtcDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function keyToUtcDate(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDaysToKey(key: string, days: number): string {
  const date = keyToUtcDate(key);
  return keyFromUtcDate(new Date(date.getTime() + days * DAY_MS));
}

function startOfMonthKey(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${year}-${pad(month)}-01`;
}

function addMonthsToKey(key: string, months: number): string {
  const [year, month] = key.split("-").map(Number);
  return keyFromUtcDate(new Date(Date.UTC(year, month - 1 + months, 1)));
}

function dayCountBetween(startKey: string, endKey: string): number {
  return Math.round(
    (keyToUtcDate(endKey).getTime() - keyToUtcDate(startKey).getTime()) / DAY_MS
  );
}

function formatDayLabel(key: string): { label: string; shortLabel: string } {
  const date = keyToUtcDate(key);
  const shortLabel = `${date.getUTCDate()} ${MONTHS_SHORT[date.getUTCMonth()]}`;
  return { label: shortLabel, shortLabel };
}

function formatMonthLabel(key: string): { label: string; shortLabel: string } {
  const [year, month] = key.split("-").map(Number);
  const monthShort = MONTHS_SHORT[month - 1];
  return {
    label: `${monthShort} ${year}`,
    shortLabel: monthShort,
  };
}

function formatRangeLabel(
  startKey: string,
  endInclusiveKey: string,
  granularity: "day" | "month"
): string {
  const start = keyToUtcDate(startKey);
  const end = keyToUtcDate(endInclusiveKey);

  if (granularity === "month") {
    return `${MONTHS_SHORT[start.getUTCMonth()]} ${start.getUTCFullYear()} – ${
      MONTHS_SHORT[end.getUTCMonth()]
    } ${end.getUTCFullYear()}`;
  }

  const startPart =
    start.getUTCFullYear() === end.getUTCFullYear()
      ? `${start.getUTCDate()} ${MONTHS_SHORT[start.getUTCMonth()]}`
      : `${start.getUTCDate()} ${MONTHS_SHORT[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
  const endPart = `${end.getUTCDate()} ${MONTHS_SHORT[end.getUTCMonth()]} ${end.getUTCFullYear()}`;

  return `${startPart} – ${endPart}`;
}

interface ReportRange {
  start: Date;
  end: Date;
  startKey: string;
  endKey: string;
  endInclusiveKey: string;
  granularity: "day" | "month";
  rangeLabel: string;
  previousStart: Date;
  previousEnd: Date;
}

function buildRange(period: ReportPeriod, now: Date = new Date()): ReportRange {
  const todayKey = todayIstKey(now);

  let startKey: string;
  let endKey: string;
  let granularity: "day" | "month";

  if (period === "12m") {
    const currentMonthKey = startOfMonthKey(todayKey);
    startKey = addMonthsToKey(currentMonthKey, -11);
    endKey = addMonthsToKey(currentMonthKey, 1);
    granularity = "month";
  } else {
    const days = period === "7d" ? 7 : 30;
    startKey = addDaysToKey(todayKey, -(days - 1));
    endKey = addDaysToKey(todayKey, 1);
    granularity = "day";
  }

  const previousStartKey =
    granularity === "month"
      ? addMonthsToKey(startKey, -12)
      : addDaysToKey(startKey, -dayCountBetween(startKey, endKey));

  const endInclusiveKey = addDaysToKey(endKey, -1);

  return {
    start: istDayRange(startKey).start,
    end: istDayRange(endKey).start,
    startKey,
    endKey,
    endInclusiveKey,
    granularity,
    rangeLabel: formatRangeLabel(startKey, endInclusiveKey, granularity),
    previousStart: istDayRange(previousStartKey).start,
    previousEnd: istDayRange(startKey).start,
  };
}

interface StatusAggregateRow {
  _id: string;
  count: number;
  revenue: number;
}

function summarize(
  rows: StatusAggregateRow[],
  activeCustomers: number,
  activeCollectors: number
): AdminReportSummary {
  let totalPickups = 0;
  let completedPickups = 0;
  let cancelledPickups = 0;
  let revenue = 0;

  for (const row of rows) {
    totalPickups += row.count;
    if (row._id === "completed") completedPickups += row.count;
    if (row._id === "cancelled") cancelledPickups += row.count;
    revenue += row.revenue;
  }

  const finished = totalPickups - cancelledPickups;
  const completionRate =
    finished > 0 ? Math.round((completedPickups / finished) * 100) : 0;

  return {
    totalPickups,
    completedPickups,
    cancelledPickups,
    inProgressPickups: Math.max(0, totalPickups - completedPickups - cancelledPickups),
    completionRate,
    revenue: Math.round(revenue),
    averageOrderValue:
      completedPickups > 0 ? Math.round(revenue / completedPickups) : 0,
    activeCustomers,
    activeCollectors,
  };
}

function summarizePrevious(rows: StatusAggregateRow[]): AdminReportPrevious {
  let totalPickups = 0;
  let completedPickups = 0;
  let cancelledPickups = 0;
  let revenue = 0;

  for (const row of rows) {
    totalPickups += row.count;
    if (row._id === "completed") completedPickups += row.count;
    if (row._id === "cancelled") cancelledPickups += row.count;
    revenue += row.revenue;
  }

  const finished = totalPickups - cancelledPickups;

  return {
    totalPickups,
    completedPickups,
    completionRate:
      finished > 0 ? Math.round((completedPickups / finished) * 100) : 0,
    revenue: Math.round(revenue),
    averageOrderValue:
      completedPickups > 0 ? Math.round(revenue / completedPickups) : 0,
  };
}

function buildTrend(
  rows: { _id: string; pickups: number; completed: number; revenue: number }[],
  range: ReportRange
): AdminReportTrendPoint[] {
  const byKey = new Map(rows.map((row) => [row._id, row] as const));
  const trend: AdminReportTrendPoint[] = [];

  if (range.granularity === "month") {
    let key = range.startKey;
    while (key < range.endKey) {
      const row = byKey.get(key);
      const labels = formatMonthLabel(key);
      trend.push({
        key,
        ...labels,
        pickups: row?.pickups ?? 0,
        completed: row?.completed ?? 0,
        revenue: Math.round(row?.revenue ?? 0),
      });
      key = addMonthsToKey(key, 1);
    }
    return trend;
  }

  let key = range.startKey;
  while (key < range.endKey) {
    const row = byKey.get(key);
    const labels = formatDayLabel(key);
    trend.push({
      key,
      ...labels,
      pickups: row?.pickups ?? 0,
      completed: row?.completed ?? 0,
      revenue: Math.round(row?.revenue ?? 0),
    });
    key = addDaysToKey(key, 1);
  }

  return trend;
}

function buildStatus(rows: StatusAggregateRow[]): AdminReportStatus[] {
  const counts = new Map(rows.map((row) => [row._id, row.count] as const));
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return STATUS_ORDER.filter((status) => (counts.get(status) ?? 0) > 0).map(
    (status) => {
      const count = counts.get(status) ?? 0;
      return {
        status,
        label: PICKUP_STATUS_LABELS[status] ?? status,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    }
  );
}

export function isReportPeriod(value: string): value is ReportPeriod {
  return value === "7d" || value === "30d" || value === "12m";
}

export async function getAdminReport(
  period: ReportPeriod
): Promise<AdminReport> {
  await connectDB();

  const range = buildRange(period);
  const match = { scheduledDate: { $gte: range.start, $lt: range.end } };
  const previousMatch = {
    scheduledDate: { $gte: range.previousStart, $lt: range.previousEnd },
  };

  const trendFormat = range.granularity === "month" ? "%Y-%m" : "%Y-%m-%d";

  const [
    statusRows,
    previousRows,
    trendRows,
    categoryRows,
    collectorRows,
    locationRows,
    customerIds,
    collectorIds,
    recentRows,
  ] = await Promise.all([
    Pickup.aggregate<StatusAggregateRow>([
      { $match: match },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          revenue: { $sum: REVENUE_EXPRESSION },
        },
      },
    ]),
    Pickup.aggregate<StatusAggregateRow>([
      { $match: previousMatch },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          revenue: { $sum: REVENUE_EXPRESSION },
        },
      },
    ]),
    Pickup.aggregate<{
      _id: string;
      pickups: number;
      completed: number;
      revenue: number;
    }>([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: {
              format: trendFormat,
              date: "$scheduledDate",
              timezone: "Asia/Kolkata",
            },
          },
          pickups: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          revenue: { $sum: REVENUE_EXPRESSION },
        },
      },
    ]),
    Pickup.aggregate<{
      _id: string;
      weight: number;
      amount: number;
      pickups: number;
    }>([
      { $match: match },
      { $unwind: "$items" },
      { $match: { "items.categoryName": { $nin: [null, ""] } } },
      {
        $group: {
          _id: "$items.categoryName",
          weight: {
            $sum: {
              $cond: [
                { $gt: [{ $ifNull: ["$items.actualWeight", 0] }, 0] },
                "$items.actualWeight",
                { $ifNull: ["$items.estimatedWeight", 0] },
              ],
            },
          },
          amount: {
            $sum: {
              $cond: [
                { $gt: [{ $ifNull: ["$items.actualWeight", 0] }, 0] },
                {
                  $multiply: [
                    "$items.actualWeight",
                    { $ifNull: ["$items.rate", 0] },
                  ],
                },
                { $ifNull: ["$items.amount", 0] },
              ],
            },
          },
          pickupIds: { $addToSet: "$_id" },
        },
      },
      {
        $project: {
          weight: 1,
          amount: 1,
          pickups: { $size: "$pickupIds" },
        },
      },
      { $sort: { amount: -1, weight: -1 } },
    ]),
    Pickup.aggregate<{
      _id: string;
      total: number;
      completed: number;
      cancelled: number;
      revenue: number;
    }>([
      { $match: { ...match, collector: { $nin: [null] } } },
      {
        $group: {
          _id: "$collector",
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
          revenue: { $sum: REVENUE_EXPRESSION },
        },
      },
      { $sort: { completed: -1, total: -1 } },
      { $limit: 8 },
    ]),
    Pickup.aggregate<{
      _id: string;
      total: number;
      completed: number;
      cancelled: number;
      revenue: number;
    }>([
      { $match: match },
      {
        $group: {
          _id: {
            $trim: {
              input: { $ifNull: ["$address.city", "Unknown"] },
            },
          },
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
          revenue: { $sum: REVENUE_EXPRESSION },
        },
      },
      { $sort: { revenue: -1, total: -1 } },
      { $limit: 8 },
    ]),
    Pickup.distinct("customer", match),
    Pickup.distinct("collector", { ...match, collector: { $nin: [null] } }),
    Pickup.find({ ...match, status: "completed" })
      .sort({ updatedAt: -1 })
      .limit(6)
      .select("pickupId address.city actualAmount estimatedAmount updatedAt")
      .populate("customer", "name")
      .lean(),
  ]);

  const activeCustomers = customerIds.filter(Boolean).length;
  const activeCollectors = collectorIds.filter(Boolean).length;

  const summary = summarize(statusRows, activeCustomers, activeCollectors);
  const previous = summarizePrevious(previousRows);
  const status = buildStatus(statusRows);

  const totalCategoryAmount = categoryRows.reduce(
    (sum, row) => sum + (row.amount || 0),
    0
  );

  const categories: AdminReportCategory[] = categoryRows
    .slice(0, 6)
    .map((row) => ({
      name: row._id,
      weight: Math.round((row.weight || 0) * 100) / 100,
      amount: Math.round(row.amount || 0),
      pickups: row.pickups || 0,
      percentage:
        totalCategoryAmount > 0
          ? Math.round(((row.amount || 0) / totalCategoryAmount) * 100)
          : 0,
    }));

  const collectorNames = new Map(
    (
      await User.find({
        _id: { $in: collectorRows.map((row) => row._id) },
      })
        .select("name")
        .lean()
    ).map((user) => [String(user._id), user.name] as const)
  );

  const collectors: AdminReportCollector[] = collectorRows.map((row) => {
    const finished = row.total - row.cancelled;
    return {
      id: String(row._id),
      name: collectorNames.get(String(row._id)) ?? "Unknown collector",
      total: row.total,
      completed: row.completed,
      cancelled: row.cancelled,
      completionRate:
        finished > 0 ? Math.round((row.completed / finished) * 100) : 0,
      revenue: Math.round(row.revenue || 0),
    };
  });

  const locations: AdminReportLocation[] = locationRows.map((row) => ({
    city: row._id || "Unknown",
    total: row.total,
    completed: row.completed,
    cancelled: row.cancelled,
    revenue: Math.round(row.revenue || 0),
  }));

  const recentCompleted = recentRows.map((row) => {
    const customer = row.customer as unknown as { name?: string } | null;
    const amount =
      (row.actualAmount ?? 0) > 0 ? row.actualAmount : row.estimatedAmount ?? 0;

    return {
      pickupId: row.pickupId,
      customerName: customer?.name ?? "Unknown customer",
      city: row.address?.city ?? "—",
      amount: Math.round(amount || 0),
      date: new Date(row.updatedAt).toISOString(),
    };
  });

  return {
    period,
    rangeLabel: range.rangeLabel,
    trendGranularity: range.granularity,
    generatedAt: new Date().toISOString(),
    summary,
    previous,
    trend: buildTrend(trendRows, range),
    status,
    categories,
    collectors,
    locations,
    recentCompleted,
  };
}
