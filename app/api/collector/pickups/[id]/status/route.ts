import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireRole } from "@/lib/auth/require-auth";
import { ApiError } from "@/lib/utils/api-error";
import { updateCollectorPickupStatus } from "@/services/pickup";
import { updatePickupStatusSchema } from "@/lib/validations/pickup";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("collector");
    const { id } = await params;

    const body = await request.json();
    const validated = updatePickupStatusSchema.parse(body);

    const pickup = await updateCollectorPickupStatus(
      id,
      user.id,
      validated.status
    );

    return successResponse("Pickup status updated", { pickup });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update pickup status";

    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Collector access required", [], 403);
    }
    if (error instanceof ZodError) {
      return errorResponse("Invalid status value", [], 400);
    }
    if (error instanceof ApiError) {
      return errorResponse(error.message, error.details, error.statusCode);
    }
    if (message.includes("not found")) {
      return errorResponse("Pickup not found", [], 404);
    }

    return errorResponse(message, [], 500);
  }
}
