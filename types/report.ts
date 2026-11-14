export type ReportPeriod = "7d" | "30d" | "12m";

export const REPORT_PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "12m", label: "Last 12 months" },
];

export interface AdminReportSummary {
  totalPickups: number;
  completedPickups: number;
  cancelledPickups: number;
  inProgressPickups: number;
  completionRate: number;
  revenue: number;
  averageOrderValue: number;
  activeCustomers: number;
  activeCollectors: number;
}

export interface AdminReportPrevious {
  totalPickups: number;
  completedPickups: number;
  completionRate: number;
  revenue: number;
  averageOrderValue: number;
}

export interface AdminReportTrendPoint {
  key: string;
  label: string;
  shortLabel: string;
  pickups: number;
  completed: number;
  revenue: number;
}

export interface AdminReportStatus {
  status: string;
  label: string;
  count: number;
  percentage: number;
}

export interface AdminReportCategory {
  name: string;
  weight: number;
  amount: number;
  pickups: number;
  percentage: number;
}

export interface AdminReportCollector {
  id: string;
  name: string;
  total: number;
  completed: number;
  cancelled: number;
  completionRate: number;
  revenue: number;
}

export interface AdminReportLocation {
  city: string;
  total: number;
  completed: number;
  cancelled: number;
  revenue: number;
}

export interface AdminReportRecentPickup {
  pickupId: string;
  customerName: string;
  city: string;
  amount: number;
  date: string;
}

export interface AdminReport {
  period: ReportPeriod;
  rangeLabel: string;
  trendGranularity: "day" | "month";
  generatedAt: string;
  summary: AdminReportSummary;
  previous: AdminReportPrevious;
  trend: AdminReportTrendPoint[];
  status: AdminReportStatus[];
  categories: AdminReportCategory[];
  collectors: AdminReportCollector[];
  locations: AdminReportLocation[];
  recentCompleted: AdminReportRecentPickup[];
}
