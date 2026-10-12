import { listActiveLocations } from "@/services/location";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET() {
  try {
    const locations = await listActiveLocations();

    return successResponse("Locations fetched successfully", { locations });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch locations";

    return errorResponse(message, [], 500);
  }
}
