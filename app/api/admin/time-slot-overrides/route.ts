import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireRole } from "@/lib/auth/require-auth";
import {
  istDateKeySchema,
  upsertTimeSlotOverrideSchema,
} from "@/lib/validations/timeSlot";
import { listSlotOverrides, upsertSlotOverride } from "@/services/time-slot";
import { ApiError } from "@/lib/utils/api-error";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/**
 * Section B — date-specific capacity overrides.
 *
 * GET  ?date=YYYY-MM-DD[&timeSlotId=…]  overrides for one IST day (default today)
 * POST { timeSlotId, date, capacity, notes? }  create or update an override
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole("admin");

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") ?? undefined;
    const timeSlotId = searchParams.get("timeSlotId") ?? undefined;

    if (date) {
      istDateKeySchema.parse(date);
    }

    const overrides = await listSlotOverrides({
      dateKey: date,
      timeSlotId,
    });

    return successResponse("Overrides fetched successfully", { overrides });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch overrides";

    if (error instanceof ZodError) {
      return errorResponse("Invalid date. Expected format YYYY-MM-DD.", [], 400);
    }
    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Admin access required", [], 403);
    }
    if (error instanceof ApiError && error.statusCode !== 500) {
      return errorResponse(message, error.details, error.statusCode);
    }

    return errorResponse(message, [], 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole("admin");

    const body = await request.json();
    const data = upsertTimeSlotOverrideSchema.parse(body);

    const override = await upsertSlotOverride(data);

    return successResponse("Override saved successfully", { override }, 201);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to save override";

    if (error instanceof ZodError) {
      return errorResponse(
        "Please provide a time slot, a date (YYYY-MM-DD) and a capacity of at least 1",
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
    if (error instanceof ApiError && error.statusCode !== 500) {
      // 409 capacity below bookings, 400 invalid date, 404 unknown slot.
      return errorResponse(message, error.details, error.statusCode);
    }

    return errorResponse(message, [], 500);
  }
}
