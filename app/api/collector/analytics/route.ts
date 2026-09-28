import { requireRole } from "@/lib/auth/require-auth";
import { getCollectorAnalytics, isAnalyticsPeriod } from "@/services/pickup";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET(request: Request) {
  try {
    const user = await requireRole("collector");

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") ?? "weekly";

    if (!isAnalyticsPeriod(period)) {
      return errorResponse("Invalid period value", [], 400);
    }

    const analytics = await getCollectorAnalytics(user.id, period);

    return successResponse("Analytics retrieved successfully", analytics);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to retrieve analytics";

    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Collector access required", [], 403);
    }

    return errorResponse(message, [], 500);
  }
}
