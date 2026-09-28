import { requireRole } from "@/lib/auth/require-auth";
import { getCollectorStats } from "@/services/pickup";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET() {
  try {
    const user = await requireRole("collector");

    const stats = await getCollectorStats(user.id);

    return successResponse("Stats retrieved successfully", stats);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to retrieve stats";

    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Collector access required", [], 403);
    }

    return errorResponse(message, [], 500);
  }
}
