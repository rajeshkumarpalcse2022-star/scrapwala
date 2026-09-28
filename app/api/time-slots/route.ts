import { listActiveTimeSlots } from "@/services/time-slot";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/**
 * Public active time slots for the customer booking flow.
 * Slots are admin-configured (spec §15) — never hardcoded client-side.
 * Includes today's availability per slot.
 */
export async function GET() {
  try {
    const timeSlots = await listActiveTimeSlots();

    return successResponse("Time slots fetched successfully", { timeSlots });
  } catch {
    return errorResponse(
      "Failed to fetch time slots. Please try again.",
      [],
      500
    );
  }
}
