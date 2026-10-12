import { requireRole } from "@/lib/auth/require-auth";
import { markAllCallbacksSeen } from "@/services/callback";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function PATCH() {
  try {
    await requireRole("admin");
    const result = await markAllCallbacksSeen();
    return successResponse("Callback requests marked as seen", result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to mark callbacks as seen";
    if (message.includes("Authentication required")) return errorResponse("Please login", [], 401);
    if (message.includes("Insufficient permissions")) return errorResponse("Admin access required", [], 403);
    return errorResponse(message, [], 500);
  }
}
