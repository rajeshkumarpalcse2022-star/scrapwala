"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import {
  adminCollectors,
  adminPickups,
} from "@/lib/constants/adminDemoData";
import {
  COLLECTOR_STATUS_LABELS,
  COLLECTOR_STATUS_COLORS,
  PICKUP_STATUS_LABELS,
  PICKUP_STATUS_COLORS,
} from "@/types/admin";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";

export default function AdminCollectorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const collector = adminCollectors.find((c) => c.id === id);
  const collectorPickups = adminPickups.filter((p) => p.collectorId === id);

  if (!collector) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center">
        <p className="text-gray-500">Collector not found.</p>
        <Link
          href="/admin/collectors"
          className="mt-4 inline-block text-emerald-600 hover:underline"
        >
          Back to Collectors
        </Link>
      </div>
    );
  }

  const completionRate =
    collector.totalCompleted > 0
      ? Math.round(
          (collector.totalCompleted /
            (collector.totalCompleted + Math.floor(collector.totalCompleted * 0.08))) *
            100
        )
      : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link
        href="/admin/collectors"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Collectors
      </Link>

      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">
          {collector.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{collector.name}</h1>
          <AdminStatusBadge
            status={collector.status}
            colors={COLLECTOR_STATUS_COLORS}
            labels={COLLECTOR_STATUS_LABELS}
          />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{collector.todayPickups}</p>
          <p className="text-xs text-gray-500">Today&apos;s Pickups</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{collector.completedToday}</p>
          <p className="text-xs text-gray-500">Completed Today</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{collector.totalCompleted}</p>
          <p className="text-xs text-gray-500">Total Completed</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <div className="flex items-center justify-center gap-1">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            <p className="text-2xl font-bold text-gray-900">{collector.rating}</p>
          </div>
          <p className="text-xs text-gray-500">Rating</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase text-gray-500">Profile</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-400">Name</span>
                <p className="font-medium text-gray-900">{collector.name}</p>
              </div>
              <div>
                <span className="text-gray-400">Phone</span>
                <p className="font-medium text-gray-900">{collector.phone}</p>
              </div>
              <div>
                <span className="text-gray-400">Email</span>
                <p className="font-medium text-gray-900">{collector.email}</p>
              </div>
              <div>
                <span className="text-gray-400">Area</span>
                <p className="font-medium text-gray-900">{collector.area}</p>
              </div>
              <div>
                <span className="text-gray-400">Joined</span>
                <p className="font-medium text-gray-900">{collector.joinedDate}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase text-gray-500">Admin Actions</h2>
            <div className="space-y-3">
              <button className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700">
                Set Available
              </button>
              <button className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                Set Offline
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase text-gray-500">Performance</h2>
            <div className="mb-4">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-gray-600">Completion Rate</span>
                <span className="font-medium text-gray-900">{completionRate}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-gray-400">Total Completed</p>
                <p className="text-lg font-bold text-gray-900">{collector.totalCompleted}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-gray-400">Today&apos;s Ratio</p>
                <p className="text-lg font-bold text-gray-900">
                  {collector.completedToday}/{collector.todayPickups}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-sm font-semibold uppercase text-gray-500">Recent Pickups</h2>
            </div>

            {collectorPickups.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-gray-500">
                No pickups found for this collector.
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 font-medium text-gray-600">ID</th>
                        <th className="px-6 py-3 font-medium text-gray-600">Date</th>
                        <th className="px-6 py-3 font-medium text-gray-600">Customer</th>
                        <th className="px-6 py-3 font-medium text-gray-600">Categories</th>
                        <th className="px-6 py-3 font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {collectorPickups.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-mono text-xs text-gray-500">{p.id}</td>
                          <td className="px-6 py-3 text-gray-600">{p.date}</td>
                          <td className="px-6 py-3 text-gray-600">{p.customerName}</td>
                          <td className="px-6 py-3 text-gray-600">{p.categories.join(", ")}</td>
                          <td className="px-6 py-3">
                            <AdminStatusBadge
                              status={p.status}
                              colors={PICKUP_STATUS_COLORS}
                              labels={PICKUP_STATUS_LABELS}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 p-4 md:hidden">
                  {collectorPickups.map((p) => (
                    <div key={p.id} className="rounded-lg border border-gray-100 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-mono text-xs text-gray-500">{p.id}</span>
                        <AdminStatusBadge
                          status={p.status}
                          colors={PICKUP_STATUS_COLORS}
                          labels={PICKUP_STATUS_LABELS}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>{p.date}</div>
                        <div>{p.customerName}</div>
                        <div className="col-span-2">{p.categories.join(", ")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
