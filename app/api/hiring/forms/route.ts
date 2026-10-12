import { requireRole } from "@/lib/auth/require-auth";
import { listPublishedHiringForms } from "@/services/hiring";
import { ApiError } from "@/lib/utils/api-error";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/**
 * Public (authenticated-user) list of published hiring forms for /careers.
 * Draft and closed forms are never included.
 */
export async function GET() {
  try {
    await requireRole("user");
    const forms = await listPublishedHiringForms();
    return successResponse("Hiring forms fetched", { forms });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch hiring forms";
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
