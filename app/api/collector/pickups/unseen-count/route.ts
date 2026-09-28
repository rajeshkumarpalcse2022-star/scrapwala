import { requireRole } from "@/lib/auth/require-auth";
import { getUnseenPickupCount } from "@/services/pickup-view";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET() {
  try {
    const user = await requireRole("collector");

    const count = await getUnseenPickupCount(user.id, "collector");

    return successResponse("Unseen pickup count retrieved", { count });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to retrieve unseen count";

    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Collector access required", [], 403);
    }

    return errorResponse(message, [], 500);
  }
}
