import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireRole } from "@/lib/auth/require-auth";
import { updateTimeSlotSchema } from "@/lib/validations/timeSlot";
import { updateTimeSlot, deleteTimeSlot } from "@/services/time-slot";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");

    const { id } = await params;
    const body = await request.json();
    const data = updateTimeSlotSchema.parse(body);

    const timeSlot = await updateTimeSlot(id, data);

    return successResponse("Time slot updated successfully", { timeSlot });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update time slot";

    if (error instanceof ZodError) {
      return errorResponse(
        "Please provide a label, start time, end time and capacity",
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
      return errorResponse("Time slot not found", [], 404);
    }
    if (
      message.includes("Invalid") ||
      message.includes("End time must be after")
    ) {
      return errorResponse(message, [], 400);
    }

    return errorResponse(message, [], 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");

    const { id } = await params;
    await deleteTimeSlot(id);

    return successResponse("Time slot deleted successfully", { id });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete time slot";

    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Admin access required", [], 403);
    }
    if (message.includes("not found")) {
      return errorResponse("Time slot not found", [], 404);
    }

    return errorResponse(message, [], 500);
  }
}
