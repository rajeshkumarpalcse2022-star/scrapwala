import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { getPublishedHiringFormBySlug } from "@/services/hiring";
import { ApiError } from "@/lib/utils/api-error";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/**
 * Public (authenticated-user) view of a published hiring form. Draft and
 * closed forms are invisible here — only `status: "published"` resolves.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await requireRole("user");
    const { slug } = await params;
    const form = await getPublishedHiringFormBySlug(slug);
    return successResponse("Hiring form fetched", { form });
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
