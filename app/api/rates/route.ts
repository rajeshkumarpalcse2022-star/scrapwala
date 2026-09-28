import { listPublicRates } from "@/services/rate";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET() {
  try {
    const rates = await listPublicRates();

    return successResponse("Rates fetched successfully", { rates });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch rates";

    return errorResponse(message, [], 500);
  }
}
