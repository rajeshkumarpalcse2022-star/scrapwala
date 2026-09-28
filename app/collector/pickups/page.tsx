"use client";

import { useEffect, useState } from "react";
import { Package, Filter } from "lucide-react";
import PickupCard from "@/components/collector/PickupCard";
import Link from "next/link";

interface Pickup {
  _id: string;
  pickupId: string;
  customer: { _id: string; name: string; phone: string; email?: string };
  address: { fullName: string; phone: string; houseFlatBuilding: string; streetArea: string; city: string; state: string; pinCode: string };
  scheduledDate: string;
  timeSlot: { startTime: string; endTime: string };
  status: string;
  items: Array<{ categoryName: string; estimatedWeight: number; unit: string; amount: number }>;
  estimatedAmount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AllPickupsPage() {
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    async function fetchPickups() {
      try {
        const params = new URLSearchParams();
        if (statusFilter) params.set("status", statusFilter);
        params.set("limit", "20");

        const res = await fetch(`/api/collector/pickups?${params.toString()}`);
        const data = await res.json();

        if (data.success) {
          setPickups(data.data.items);
          setPagination(data.data.pagination);
        }
      } catch {
        // Error handled silently
      } finally {
        setLoading(false);
      }
    }

    fetchPickups();
  }, [statusFilter]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-muted">Loading pickups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold">All Pickups</h1>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Statuses</option>
            <option value="assigned">Assigned</option>
            <option value="accepted">Accepted</option>
            <option value="on_the_way">On the Way</option>
            <option value="arrived">Arrived</option>
            <option value="weighing">Weighing</option>
            <option value="payment_pending">Payment Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {pickups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <Package className="w-16 h-16 mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold mb-2">No Pickups</h2>
          <p>You don&apos;t have any pickups yet.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pickups.map((pickup) => (
              <PickupCard key={pickup._id} pickup={pickup} />
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                <Link
                  key={page}
                  href={`/collector/pickups?page=${page}`}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    page === pagination.page
                      ? "bg-primary text-white"
                      : "border border-border text-foreground hover:bg-muted-light"
                  }`}
                >
                  {page}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
