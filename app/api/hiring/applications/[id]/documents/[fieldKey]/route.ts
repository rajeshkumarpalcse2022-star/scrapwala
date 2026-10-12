import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import {
  getApplicationDocumentDeliveryUrl,
  getOwnHiringApplication,
} from "@/services/hiring";
import { ApiError } from "@/lib/utils/api-error";
import { errorResponse } from "@/lib/utils/api-response";

/**
 * Owner-only access to a private applicant document. Verifies the
 * application belongs to the session user, then redirects to a short-lived
 * signed Cloudinary URL (no permanent public link ever exists).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; fieldKey: string }> }
) {
  try {
    const user = await requireRole("user");
    const { id, fieldKey } = await params;

    await getOwnHiringApplication(id, user.id);

    const document = await getApplicationDocumentDeliveryUrl(id, fieldKey);
    return NextResponse.redirect(document.url, 302);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to access document";
    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Not available for this account", [], 403);
    }
    if (error instanceof ApiError && error.statusCode !== 500) {
      return errorResponse(message, error.details, error.statusCode);
    }
    return errorResponse("Failed to access the document", [], 500);
  }
}
