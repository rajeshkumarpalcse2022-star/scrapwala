import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { getOwnHiringApplication } from "@/services/hiring";
import { ApiError } from "@/lib/utils/api-error";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/**
 * The authenticated applicant's own application detail. Ownership is checked
 * against the session user — a client-supplied user id is never used.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("user");
    const { id } = await params;
    const application = await getOwnHiringApplication(id, user.id);
    return successResponse("Application fetched", { application });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch application";
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
