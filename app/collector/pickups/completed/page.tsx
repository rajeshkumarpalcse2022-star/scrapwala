"use client";

import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import PickupCard from "@/components/collector/PickupCard";

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
  actualAmount?: number;
}

export default function CompletedPickupsPage() {
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPickups() {
      try {
        const res = await fetch("/api/collector/pickups?status=completed&limit=50");
        const data = await res.json();

        if (data.success) {
          setPickups(data.data.items);
        }
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
          <p className="text-sm text-muted">Loading completed pickups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">Completed Pickups</h1>

      {pickups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <Package className="w-16 h-16 mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold mb-2">No Completed Pickups</h2>
          <p>You haven&apos;t completed any pickups yet.</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-xl border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pickups.map((pickup) => (
                  <tr key={pickup._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium">{pickup.pickupId}</td>
                    <td className="px-6 py-4 text-sm">{pickup.customer?.name ?? "N/A"}</td>
                    <td className="px-6 py-4 text-sm">
                      {new Date(pickup.scheduledDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      ₹{(pickup.actualAmount ?? pickup.estimatedAmount).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden grid gap-4">
            {pickups.map((pickup) => (
              <PickupCard key={pickup._id} pickup={pickup} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
