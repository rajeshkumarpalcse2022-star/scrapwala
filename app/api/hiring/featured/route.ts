import { requireRole } from "@/lib/auth/require-auth";
import { getFeaturedHiringForm } from "@/services/hiring";
import { ApiError } from "@/lib/utils/api-error";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/**
 * Featured hiring form used by the header "Hiring" link visibility check.
 * Only authenticated customers (role `user`) may see it — admin/collector/
 * logged-out callers receive 403 and the link stays hidden.
 */
export async function GET() {
  try {
    await requireRole("user");
    const form = await getFeaturedHiringForm();
    return successResponse("Featured hiring form fetched", { form });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch hiring form";
    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Not available for this account", [], 403);
    }
    if (error instanceof ApiError && error.statusCode !== 500) {
      return errorResponse(message, error.details, error.statusCode);
    }
    return errorResponse(message, [], 500);
  }
}
