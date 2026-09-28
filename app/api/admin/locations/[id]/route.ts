import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireRole } from "@/lib/auth/require-auth";
import { updateLocationSchema } from "@/lib/validations/location";
import { updateLocation } from "@/services/location";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");

    const { id } = await params;
    const body = await request.json();
    const data = updateLocationSchema.parse(body);

    const location = await updateLocation(id, data);

    return successResponse("Location updated successfully", { location });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update location";

    if (error instanceof ZodError) {
      return errorResponse(
        "Please provide a valid name, city, state and at least one 6-digit PIN code",
        [],
        400
      );
    }
    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Admin access required", [], 403);
    }
    if (message.includes("not found")) {
      return errorResponse("Location not found", [], 404);
    }
    if (message.includes("PIN code")) {
      return errorResponse(message, [], 400);
    }

    return errorResponse(message, [], 500);
  }
}
