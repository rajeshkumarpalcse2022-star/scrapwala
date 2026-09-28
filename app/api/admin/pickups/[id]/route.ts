import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireRole } from "@/lib/auth/require-auth";
import {
  getAdminPickupById,
  updateAdminPickupStatus,
  assignCollectorToPickup,
} from "@/services/pickup";
import {
  updatePickupStatusSchema,
  assignCollectorSchema,
} from "@/lib/validations/pickup";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
    const { id } = await params;

    const pickup = await getAdminPickupById(id);

    return successResponse("Pickup retrieved successfully", { pickup });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to retrieve pickup";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
    const { id } = await params;

    const body = await request.json();

    if (body.status !== undefined) {
      const validated = updatePickupStatusSchema.parse({ status: body.status });
      const pickup = await updateAdminPickupStatus(id, validated.status);
      return successResponse("Pickup status updated", { pickup });
    }

    if (body.collectorId !== undefined) {
      const validated = assignCollectorSchema.parse({
        collectorId: body.collectorId,
      });
      const pickup = await assignCollectorToPickup(id, validated.collectorId);
      return successResponse("Collector assigned successfully", { pickup });
    }

    return errorResponse("No valid update fields provided", [], 400);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update pickup";

    if (error instanceof ZodError) {
      return errorResponse("Invalid request payload", [], 400);
    }
    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Admin access required", [], 403);
    }
    if (message.includes("Invalid collector id")) {
      return errorResponse("Invalid collector selected", [], 400);
    }
    if (message.includes("Collector not found")) {
      return errorResponse("Selected collector not found", [], 404);
    }
    if (message.includes("not found")) {
      return errorResponse("Pickup not found", [], 404);
    }
    if (message.includes("Invalid status value")) {
      return errorResponse("Invalid status value", [], 400);
    }
    if (message.includes("User is not a collector")) {
      return errorResponse("Selected user is not a collector", [], 400);
    }
    if (message.includes("Collector is not active")) {
      return errorResponse("Selected collector is not active", [], 400);
    }

    return errorResponse(message, [], 500);
  }
}
