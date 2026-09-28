"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { adminPayments } from "@/lib/constants/adminDemoData";
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  type AdminPaymentStatus,
  type AdminPaymentMethod,
} from "@/types/admin";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";

type StatusFilter = "all" | AdminPaymentStatus;
type MethodFilter = "all" | AdminPaymentMethod;

const METHOD_LABELS: Record<AdminPaymentMethod, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
};

export default function AdminPaymentsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("all");

  const filtered = useMemo(() => {
    return adminPayments.filter((p) => {
      const query = search.toLowerCase();
      const matchSearch =
        p.id.toLowerCase().includes(query) ||
        p.pickupId.toLowerCase().includes(query) ||
        p.customerName.toLowerCase().includes(query);
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      const matchMethod = methodFilter === "all" || p.method === methodFilter;
      return matchSearch && matchStatus && matchMethod;
    });
  }, [search, statusFilter, methodFilter]);

  const totalAmount = filtered.reduce((sum, p) => sum + p.amount, 0);
  const paidCount = filtered.filter((p) => p.status === "paid").length;
  const pendingCount = filtered.filter((p) => p.status === "pending").length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Payment Management"
        subtitle="Track and manage all payment records."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by payment ID, pickup ID, or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "pending", "paid", "failed", "refunded"] as StatusFilter[]).map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  statusFilter === status
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {status === "all" ? "All Status" : PAYMENT_STATUS_LABELS[status]}
              </button>
            )
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "cash", "upi", "bank_transfer"] as MethodFilter[]).map(
            (method) => (
              <button
                key={method}
                onClick={() => setMethodFilter(method)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  methodFilter === method
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {method === "all" ? "All Methods" : METHOD_LABELS[method]}
              </button>
            )
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Total Amount</p>
          <p className="text-lg font-bold text-gray-900">
            ₹{totalAmount.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Paid</p>
          <p className="text-lg font-bold text-emerald-600">{paidCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Pending</p>
          <p className="text-lg font-bold text-yellow-600">{pendingCount}</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <p className="text-sm text-gray-500">No payments found.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600">
                    Payment ID
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600">
                    Pickup ID
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600">
                    Customer
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600">
                    Amount
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600">
                    Method
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="px-4 py-3 font-medium text-gray-600">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {p.id}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {p.pickupId}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {p.customerName}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      ₹{p.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {METHOD_LABELS[p.method]}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.date}</td>
                    <td className="px-4 py-3">
                      <AdminStatusBadge
                        status={p.status}
                        colors={PAYMENT_STATUS_COLORS}
                        labels={PAYMENT_STATUS_LABELS}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 md:hidden">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-gray-200 bg-white p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-gray-500">{p.id}</span>
                  <AdminStatusBadge
                    status={p.status}
                    colors={PAYMENT_STATUS_COLORS}
                    labels={PAYMENT_STATUS_LABELS}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">
                    {p.customerName}
                  </h3>
                  <span className="text-lg font-bold text-gray-900">
                    ₹{p.amount.toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div>
                    <span className="text-gray-400">Pickup: </span>
                    {p.pickupId}
                  </div>
                  <div>
                    <span className="text-gray-400">Method: </span>
                    {METHOD_LABELS[p.method]}
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400">Date: </span>
                    {p.date}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
