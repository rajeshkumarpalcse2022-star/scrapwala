import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { deleteSlotOverride } from "@/services/time-slot";
import { ApiError } from "@/lib/utils/api-error";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/** Remove one date-specific override (rejected if bookings need it). */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");

    const { id } = await params;
    await deleteSlotOverride(id);

    return successResponse("Override removed successfully", { id });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to remove override";

    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Admin access required", [], 403);
    }
    if (error instanceof ApiError && error.statusCode !== 500) {
      // 409 would put the date over regular capacity, 404 unknown override.
      return errorResponse(message, error.details, error.statusCode);
    }
    if (message.includes("not found")) {
      return errorResponse("Override not found", [], 404);
    }

    return errorResponse(message, [], 500);
  }
}
