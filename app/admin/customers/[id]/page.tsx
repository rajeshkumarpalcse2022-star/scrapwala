"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { adminCustomers, adminPickups } from "@/lib/constants/adminDemoData";
import { PICKUP_STATUS_LABELS, PICKUP_STATUS_COLORS } from "@/types/admin";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";

export default function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const customer = adminCustomers.find((c) => c.id === id);
  const customerPickups = adminPickups.filter((p) => p.customerId === id);

  if (!customer) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center">
        <p className="text-gray-500">Customer not found.</p>
        <Link href="/admin/customers" className="mt-4 inline-block text-emerald-600 hover:underline">
          Back to Customers
        </Link>
      </div>
    );
  }

  const maskedPhone = customer.phone.replace(/(\+\d{2}\s)\d{5}(\s\d{5})/, "$1XXXXX$2");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link
        href="/admin/customers"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Customers
      </Link>

      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            customer.status === "active"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {customer.status === "active" ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase text-gray-500">Contact</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-400">Name</span>
                <p className="font-medium text-gray-900">{customer.name}</p>
              </div>
              <div>
                <span className="text-gray-400">Phone</span>
                <p className="font-medium text-gray-900">{maskedPhone}</p>
              </div>
              <div>
                <span className="text-gray-400">Email</span>
                <p className="font-medium text-gray-900">{customer.email}</p>
              </div>
              <div>
                <span className="text-gray-400">Address</span>
                <p className="font-medium text-gray-900">{customer.address}</p>
              </div>
              <div>
                <span className="text-gray-400">City</span>
                <p className="font-medium text-gray-900">{customer.city}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase text-gray-500">Stats</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{customer.totalPickups}</p>
                <p className="text-xs text-gray-500">Total Pickups</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{customer.completedPickups}</p>
                <p className="text-xs text-gray-500">Completed</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{customer.cancelledPickups}</p>
                <p className="text-xs text-gray-500">Cancelled</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">₹{customer.totalEarned.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Total Earned</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-sm font-semibold uppercase text-gray-500">Pickup History</h2>
            </div>

            {customerPickups.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-gray-500">
                No pickups found for this customer.
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 font-medium text-gray-600">ID</th>
                        <th className="px-6 py-3 font-medium text-gray-600">Date</th>
                        <th className="px-6 py-3 font-medium text-gray-600">Categories</th>
                        <th className="px-6 py-3 font-medium text-gray-600">Amount</th>
                        <th className="px-6 py-3 font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {customerPickups.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-mono text-xs text-gray-500">{p.id}</td>
                          <td className="px-6 py-3 text-gray-600">{p.date}</td>
                          <td className="px-6 py-3 text-gray-600">
                            {p.categories.join(", ")}
                          </td>
                          <td className="px-6 py-3 font-medium text-gray-900">
                            {p.finalAmount ? `₹${p.finalAmount.toLocaleString()}` : p.estimatedAmount}
                          </td>
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
                  {customerPickups.map((p) => (
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
                        <div className="font-medium">{p.finalAmount ? `₹${p.finalAmount.toLocaleString()}` : p.estimatedAmount}</div>
                        <div className="col-span-2">{p.categories.join(", ")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase text-gray-500">Recent Activity</h2>
            <div className="relative space-y-4 pl-6">
              <div className="absolute left-2 top-2 bottom-2 w-px bg-gray-200" />
              {customerPickups.slice(-5).reverse().map((p) => (
                <div key={p.id} className="relative">
                  <div className="absolute -left-4 top-1.5 h-3 w-3 rounded-full border-2 border-white bg-gray-300" />
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">
                      Pickup {p.id}
                    </p>
                    <p className="text-gray-500">
                      {p.date} — {PICKUP_STATUS_LABELS[p.status]}
                    </p>
                    <p className="text-gray-500">{p.categories.join(", ")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
