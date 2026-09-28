"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { adminCustomers } from "@/lib/constants/adminDemoData";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

type StatusFilter = "all" | "active" | "inactive";

export default function AdminCustomersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = adminCustomers.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Customer Management"
        subtitle="View and manage all registered customers."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {(["all", "active", "inactive"] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg px-3 py-2 text-sm font-medium capitalize transition ${
                statusFilter === status
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <p className="text-sm text-gray-500">No customers found.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600">ID</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Phone</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Total Pickups</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Completed</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Total Earned</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Joined</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                    <td className="px-4 py-3 text-gray-600">{c.email}</td>
                    <td className="px-4 py-3 text-gray-600">{c.totalPickups}</td>
                    <td className="px-4 py-3 text-gray-600">{c.completedPickups}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">₹{c.totalEarned.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">{c.joinedDate}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          c.status === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {c.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/customers/${c.id}`}
                        className="text-emerald-600 hover:text-emerald-700 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 md:hidden">
            {filtered.map((c) => (
              <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">{c.name}</h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      c.status === "active"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {c.status === "active" ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div>
                    <span className="text-gray-400">Phone: </span>{c.phone}
                  </div>
                  <div>
                    <span className="text-gray-400">Email: </span>{c.email}
                  </div>
                  <div>
                    <span className="text-gray-400">Pickups: </span>{c.totalPickups}
                  </div>
                  <div>
                    <span className="text-gray-400">Earned: </span>₹{c.totalEarned.toLocaleString()}
                  </div>
                  <div>
                    <span className="text-gray-400">Joined: </span>{c.joinedDate}
                  </div>
                  <div>
                    <span className="text-gray-400">ID: </span>
                    <span className="font-mono text-xs">{c.id}</span>
                  </div>
                </div>
                <Link
                  href={`/admin/customers/${c.id}`}
                  className="inline-block text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  View Details
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
