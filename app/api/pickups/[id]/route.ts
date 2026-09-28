import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { getCustomerPickupById } from "@/services/pickup";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("user");
    const { id } = await params;

    const pickup = await getCustomerPickupById(id, user.id);

    const safePickup = {
      pickupId: pickup.pickupId,
      status: pickup.status,
      vehicle: pickup.vehicle,
      scheduledDate: pickup.scheduledDate,
      timeSlot: pickup.timeSlot,
      address: pickup.address,
      items: pickup.items.map((item) => ({
        categoryName: item.categoryName,
        rate: item.rate,
        unit: item.unit,
        estimatedWeight: item.estimatedWeight,
        actualWeight: item.actualWeight,
        amount: item.amount,
      })),
      expectedWeight: pickup.expectedWeight,
      estimatedAmount: pickup.estimatedAmount,
      actualAmount: pickup.actualAmount,
      paymentStatus: pickup.paymentStatus,
      notes: pickup.notes,
      createdAt: pickup.createdAt,
    };

    return successResponse("Pickup retrieved successfully", safePickup);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to retrieve pickup";

    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Only customers can view pickups", [], 403);
    }
    if (message.includes("not found")) {
      return errorResponse("Pickup not found", [], 404);
    }

    return errorResponse(message, [], 500);
  }
}
