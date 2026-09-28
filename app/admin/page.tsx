"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Package,
  Clock,
  CheckCircle2,
  Users,
  UserCheck,
  IndianRupee,
  ArrowRight,
  Plus,
  TrendingUp,
  FileText,
  Star,
  Loader2,
} from "lucide-react";
import {
  adminStats,
  adminCollectors,
  dashboardActivity,
} from "@/lib/constants/adminDemoData";
import {
  PICKUP_STATUS_LABELS,
  PICKUP_STATUS_COLORS,
  COLLECTOR_STATUS_LABELS,
  COLLECTOR_STATUS_COLORS,
  type AdminPickupStatus,
} from "@/types/admin";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";

interface PickupCustomer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
}

interface PickupCollector {
  _id: string;
  name: string;
  phone: string;
  role: string;
}

interface PickupAddress {
  fullName: string;
  phone: string;
  houseFlatBuilding: string;
  streetArea: string;
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
  estimatedAmount: number;
  createdAt: string;
}

interface ApiResponse {
  success: boolean;
  data: {
    items: PickupData[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

const statCards = [
  {
    label: "Total Pickups",
    value: adminStats.totalPickups,
    icon: Package,
    color: "text-blue-600 bg-blue-100",
  },
  {
    label: "Pending",
    value: adminStats.pendingPickups,
    icon: Clock,
    color: "text-amber-600 bg-amber-100",
  },
  {
    label: "Completed",
    value: adminStats.completedPickups,
    icon: CheckCircle2,
    color: "text-emerald-600 bg-emerald-100",
  },
  {
    label: "Active Collectors",
    value: adminStats.activeCollectors,
    icon: UserCheck,
    color: "text-indigo-600 bg-indigo-100",
  },
  {
    label: "Total Customers",
    value: adminStats.totalCustomers,
    icon: Users,
    color: "text-purple-600 bg-purple-100",
  },
  {
    label: "Today's Revenue",
    value: `₹${adminStats.todayRevenue.toLocaleString("en-IN")}`,
    icon: IndianRupee,
    color: "text-emerald-600 bg-emerald-100",
  },
];

const activityPills = [
  { label: "Scheduled", value: dashboardActivity.scheduled, color: "bg-blue-500" },
  { label: "Assigned", value: dashboardActivity.assigned, color: "bg-indigo-500" },
  { label: "Accepted", value: dashboardActivity.accepted, color: "bg-yellow-500" },
  { label: "On the Way", value: dashboardActivity.onTheWay, color: "bg-purple-500" },
  { label: "Completed", value: dashboardActivity.completed, color: "bg-emerald-500" },
  { label: "Cancelled", value: dashboardActivity.cancelled, color: "bg-red-500" },
];

const quickActions = [
  { label: "View Pickups", href: "/admin/pickups", icon: Package },
  { label: "Add Collector", href: "#", icon: Plus },
  { label: "Update Rates", href: "/admin/rates", icon: TrendingUp },
  { label: "View Reports", href: "/admin/reports", icon: FileText },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatAddress(address: PickupAddress): string {
  const parts = [address.houseFlatBuilding, address.streetArea, address.city];
  return parts.filter(Boolean).join(", ");
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AdminDashboardPage() {
  const [recentPickups, setRecentPickups] = useState<PickupData[]>([]);
  const [loadingPickups, setLoadingPickups] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingPickups(true);
      try {
        const response = await fetch("/api/admin/pickups?limit=6");
        if (response.ok && !cancelled) {
          const data: ApiResponse = await response.json();
          if (data.success && data.data?.items) {
            setRecentPickups(data.data.items);
          }
        }
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) {
          setLoadingPickups(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4">
      <AdminPageHeader
        title="Dashboard"
        subtitle="Here's what's happening across ScrapWala today."
      />

      <div className="mt-8 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">
                  {stat.label}
                </span>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.color}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">
          Today&apos;s Pickup Activity
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {activityPills.map((pill) => (
            <div
              key={pill.label}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm"
            >
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${pill.color}`}
              />
              <span className="text-gray-600">{pill.label}</span>
              <span className="font-semibold text-gray-900">{pill.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Pickups
          </h2>
          <Link
            href="/admin/pickups"
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            View all
          </Link>
        </div>

        {loadingPickups ? (
          <div className="mt-4 flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : recentPickups.length === 0 ? (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-500">No pickups yet.</p>
          </div>
        ) : (
          <>
            <div className="mt-4 hidden md:block overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                    <th className="px-4 py-3">Pickup ID</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Collector</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentPickups.map((pickup) => (
                    <tr key={pickup._id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                        {pickup.pickupId}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {pickup.customer?.name ?? "Unknown"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {formatAddress(pickup.address)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {pickup.collector?.name ?? "Unassigned"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {formatDate(pickup.scheduledDate)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                        ₹{pickup.estimatedAmount.toLocaleString("en-IN")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <AdminStatusBadge
                          status={pickup.status}
                          colors={PICKUP_STATUS_COLORS}
                          labels={PICKUP_STATUS_LABELS}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-3 md:hidden">
              {recentPickups.map((pickup) => (
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
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {pickup.collector?.name ?? "Unassigned"}
                    </span>
                    <span className="font-medium text-gray-900">
                      ₹{pickup.estimatedAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Collector Status</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {adminCollectors.map((collector) => (
            <div
              key={collector.id}
              className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                {getInitials(collector.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 truncate">
                    {collector.name}
                  </span>
                  <AdminStatusBadge
                    status={collector.status}
                    colors={COLLECTOR_STATUS_COLORS}
                    labels={COLLECTOR_STATUS_LABELS}
                  />
                </div>
                <div className="mt-1 flex gap-4 text-sm text-gray-500">
                  <span>
                    Today:{" "}
                    <span className="font-medium text-gray-700">
                      {collector.todayPickups}
                    </span>
                  </span>
                  <span>
                    Done:{" "}
                    <span className="font-medium text-gray-700">
                      {collector.completedToday}
                    </span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm text-amber-600">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-medium">{collector.rating}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 pb-24">
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-100">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-medium text-gray-900">{action.label}</span>
                <ArrowRight className="ml-auto h-4 w-4 text-gray-400 transition group-hover:text-emerald-600" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
