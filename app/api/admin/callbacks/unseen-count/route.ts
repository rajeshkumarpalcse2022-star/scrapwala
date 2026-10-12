import { requireRole } from "@/lib/auth/require-auth";
import { getUnseenCallbackCount } from "@/services/callback";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET() {
  try {
    await requireRole("admin");
    const count = await getUnseenCallbackCount();
    return successResponse("Unseen callback count retrieved", { count });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to retrieve unseen count";
    if (message.includes("Authentication required")) return errorResponse("Please login", [], 401);
    if (message.includes("Insufficient permissions")) return errorResponse("Admin access required", [], 403);
    return errorResponse(message, [], 500);
  }
}
