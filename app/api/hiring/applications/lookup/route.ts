import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { getOwnApplicationForAutofill } from "@/services/hiring";
import { ApiError } from "@/lib/utils/api-error";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/**
 * Look up the caller's OWN previous application by human Application ID so a
 * new application form can be auto-filled. Only role `user` may call it, and
 * the service only ever returns applications owned by the caller.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole("user");
    const applicationId = request.nextUrl.searchParams
      .get("applicationId")
      ?.trim();
    if (!applicationId) {
      return errorResponse("Please provide an Application ID", [], 400);
    }

    const result = await getOwnApplicationForAutofill(applicationId, user.id);
    return successResponse("Previous application fetched", result);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch the previous application";
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
