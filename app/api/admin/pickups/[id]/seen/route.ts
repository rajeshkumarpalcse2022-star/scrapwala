import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { markPickupSeen } from "@/services/pickup-view";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("admin");
    const { id } = await params;

    await markPickupSeen(id, user.id, "admin");

    return successResponse("Pickup marked as seen", { pickupId: id });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to mark pickup as seen";

    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Admin access required", [], 403);
    }
    if (message.includes("not found")) {
      return errorResponse("Pickup not found", [], 404);
    }

    return errorResponse(message, [], 500);
  }
}
