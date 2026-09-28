"use client";

import { useState, useMemo } from "react";
import { Search, ArrowUpRight, ArrowDownLeft, Minus } from "lucide-react";
import { adminTransactions } from "@/lib/constants/adminDemoData";
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  type AdminPaymentStatus,
  type AdminPaymentMethod,
} from "@/types/admin";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";

type StatusFilter = "all" | AdminPaymentStatus;
type TypeFilter = "all" | "pickup_payment" | "refund" | "adjustment";

const METHOD_LABELS: Record<AdminPaymentMethod, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
};

const TYPE_LABELS: Record<string, string> = {
  pickup_payment: "Pickup Payment",
  refund: "Refund",
  adjustment: "Adjustment",
};

export default function AdminTransactionsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const filtered = useMemo(() => {
    return adminTransactions.filter((t) => {
      const query = search.toLowerCase();
      const matchSearch =
        t.id.toLowerCase().includes(query) ||
        t.pickupId.toLowerCase().includes(query) ||
        t.customerName.toLowerCase().includes(query) ||
        t.collectorName.toLowerCase().includes(query);
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      const matchType = typeFilter === "all" || t.type === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [search, statusFilter, typeFilter]);

  const totalIncome = filtered
    .filter((t) => t.type === "pickup_payment" && t.status === "paid")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalRefunds = filtered
    .filter((t) => t.type === "refund")
    .reduce((sum, t) => sum + t.amount, 0);
  const netAmount = totalIncome - totalRefunds;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Transaction History"
        subtitle="View all financial transactions."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by transaction ID, pickup, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(
            ["all", "pickup_payment", "refund", "adjustment"] as TypeFilter[]
          ).map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                typeFilter === type
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {type === "all" ? "All Types" : TYPE_LABELS[type]}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "paid", "pending", "failed", "refunded"] as StatusFilter[]).map(
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
                {status === "all"
                  ? "All Status"
                  : PAYMENT_STATUS_LABELS[status]}
              </button>
            )
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Total Income</p>
          <p className="text-lg font-bold text-emerald-600">
            ₹{totalIncome.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Total Refunds</p>
          <p className="text-lg font-bold text-red-600">
            ₹{totalRefunds.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Net Amount</p>
          <p className="text-lg font-bold text-gray-900">
            ₹{netAmount.toLocaleString()}
          </p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <p className="text-sm text-gray-500">No transactions found.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600">
                    Transaction ID
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600">
                    Pickup ID
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600">
                    Customer
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600">
                    Collector
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600">
                    Amount
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="px-4 py-3 font-medium text-gray-600">
                    Method
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600">
                    Status
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {t.id}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {t.pickupId}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {t.customerName}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {t.collectorName}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      ₹{t.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {t.type === "pickup_payment" && (
                          <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                        )}
                        {t.type === "refund" && (
                          <ArrowDownLeft className="h-4 w-4 text-red-500" />
                        )}
                        {t.type === "adjustment" && (
                          <Minus className="h-4 w-4 text-yellow-500" />
                        )}
                        <span
                          className={`text-sm font-medium ${
                            t.type === "pickup_payment"
                              ? "text-emerald-600"
                              : t.type === "refund"
                                ? "text-red-600"
                                : "text-yellow-600"
                          }`}
                        >
                          {TYPE_LABELS[t.type]}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {METHOD_LABELS[t.method]}
                    </td>
                    <td className="px-4 py-3">
                      <AdminStatusBadge
                        status={t.status}
                        colors={PAYMENT_STATUS_COLORS}
                        labels={PAYMENT_STATUS_LABELS}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{t.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 lg:hidden">
            {filtered.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-gray-200 bg-white p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-gray-500">
                    {t.id}
                  </span>
                  <AdminStatusBadge
                    status={t.status}
                    colors={PAYMENT_STATUS_COLORS}
                    labels={PAYMENT_STATUS_LABELS}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {t.type === "pickup_payment" && (
                      <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                    )}
                    {t.type === "refund" && (
                      <ArrowDownLeft className="h-5 w-5 text-red-500" />
                    )}
                    {t.type === "adjustment" && (
                      <Minus className="h-5 w-5 text-yellow-500" />
                    )}
                    <span className="font-medium text-gray-900">
                      {t.customerName}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    ₹{t.amount.toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div>
                    <span className="text-gray-400">Pickup: </span>
                    {t.pickupId}
                  </div>
                  <div>
                    <span className="text-gray-400">Type: </span>
                    <span
                      className={
                        t.type === "pickup_payment"
                          ? "text-emerald-600"
                          : t.type === "refund"
                            ? "text-red-600"
                            : "text-yellow-600"
                      }
                    >
                      {TYPE_LABELS[t.type]}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Collector: </span>
                    {t.collectorName}
                  </div>
                  <div>
                    <span className="text-gray-400">Method: </span>
                    {METHOD_LABELS[t.method]}
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400">Date: </span>
                    {t.date}
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
