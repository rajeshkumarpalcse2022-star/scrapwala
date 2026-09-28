"use client";

import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import PickupCard from "@/components/collector/PickupCard";
import UnseenCountBadge from "@/components/UnseenCountBadge";
import { useUnseenPickupCount } from "@/hooks/useUnseenPickupCount";

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

export default function UpcomingPickupsPage() {
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);
  const unseenCount = useUnseenPickupCount("collector");

  useEffect(() => {
    async function fetchPickups() {
      try {
        const statuses = ["assigned", "accepted", "on_the_way", "arrived"];
        const params = new URLSearchParams();
        params.set("limit", "50");

        // Fetch all upcoming statuses
        const results = await Promise.all(
          statuses.map((status) =>
            fetch(`/api/collector/pickups?status=${status}&limit=50`).then((r) => r.json())
          )
        );

        const allPickups = results
          .filter((r) => r.success)
          .flatMap((r) => r.data.items);

        setPickups(allPickups);
      } catch {
        // Error handled silently
      } finally {
        setLoading(false);
      }
    }

    fetchPickups();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-muted">Loading upcoming pickups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold">Upcoming Pickups</h1>
        <UnseenCountBadge count={unseenCount} />
      </div>

      {pickups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <Package className="w-16 h-16 mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold mb-2">No Upcoming Pickups</h2>
          <p>You have no scheduled pickups at the moment.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pickups.map((pickup) => (
            <PickupCard key={pickup._id} pickup={pickup} />
          ))}
        </div>
      )}
    </div>
  );
}
