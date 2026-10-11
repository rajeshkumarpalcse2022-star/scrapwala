import { NextRequest } from "next/server";
import { listActiveTimeSlots } from "@/services/time-slot";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { ApiError } from "@/lib/utils/api-error";

/**
 * Public active time slots for the customer booking flow.
 * Slots are admin-configured (spec §15) — never hardcoded client-side.
 *
 * `?date=YYYY-MM-DD` scopes availability to one IST calendar day
 * (defaults to today in Asia/Kolkata) so the customer step-7 screen shows
 * real per-date booked/available counts, not a static list.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") ?? undefined;

    const timeSlots = await listActiveTimeSlots(date);

    return successResponse("Time slots fetched successfully", { timeSlots });
  } catch (error: unknown) {
    if (error instanceof ApiError && error.statusCode !== 500) {
      return errorResponse(error.message, error.details, error.statusCode);
    }
    return errorResponse(
      "Failed to fetch time slots. Please try again.",
      [],
      500
    );
  }
}
