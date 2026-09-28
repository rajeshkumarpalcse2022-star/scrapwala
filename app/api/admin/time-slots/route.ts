import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireRole } from "@/lib/auth/require-auth";
import { createTimeSlotSchema } from "@/lib/validations/timeSlot";
import { listAdminTimeSlots, createTimeSlot } from "@/services/time-slot";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET() {
  try {
    await requireRole("admin");

    const timeSlots = await listAdminTimeSlots();

    return successResponse("Time slots fetched successfully", { timeSlots });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch time slots";

    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Admin access required", [], 403);
    }

    return errorResponse(message, [], 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole("admin");

    const body = await request.json();
    const data = createTimeSlotSchema.parse(body);

    const timeSlot = await createTimeSlot(data);

    return successResponse("Time slot created successfully", { timeSlot }, 201);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create time slot";

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
    if (
      message.includes("Invalid") ||
      message.includes("End time must be after")
    ) {
      return errorResponse(message, [], 400);
    }

    return errorResponse(message, [], 500);
  }
}
