"use client";

import { useEffect, useState } from "react";
import CollectorStats from "@/components/collector/CollectorStats";
import CollectorAnalytics from "@/components/collector/CollectorAnalytics";
import PickupCard from "@/components/collector/PickupCard";
import { Package } from "lucide-react";

interface Stats {
  assigned: number;
  accepted: number;
  inProgress: number;
  completed: number;
}

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

export default function CollectorDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentPickups, setRecentPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, pickupsRes] = await Promise.all([
          fetch("/api/collector/stats"),
          fetch("/api/collector/pickups?limit=6"),
        ]);

        const statsData = await statsRes.json();
        const pickupsData = await pickupsRes.json();

        if (statsData.success) setStats(statsData.data);
        if (pickupsData.success) setRecentPickups(pickupsData.data.items);
      } catch {
        // Error handled silently
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">Today&apos;s Overview</h1>
      {stats && <CollectorStats {...stats} />}

      <CollectorAnalytics />

      <h2 className="text-xl font-semibold mt-8 mb-4">Today&apos;s Pickups</h2>
      {recentPickups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <Package className="w-16 h-16 mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold mb-2">No Pickups</h2>
          <p>You don&apos;t have any pickups assigned yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recentPickups.map((pickup) => (
            <PickupCard key={pickup._id} pickup={pickup} />
          ))}
        </div>
      )}
    </div>
  );
}
