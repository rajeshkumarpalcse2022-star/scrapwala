import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { buildApplicationPdf, getOwnHiringApplication } from "@/services/hiring";
import { ApiError } from "@/lib/utils/api-error";
import { errorResponse } from "@/lib/utils/api-response";

/**
 * Application summary PDF for the owning applicant. Uses the same generator
 * and saved application snapshot the admin download uses.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("user");
    const { id } = await params;

    // Ownership check before any PDF work happens.
    await getOwnHiringApplication(id, user.id);

    const { buffer, fileName } = await buildApplicationPdf(id);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to generate PDF";
    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Not available for this account", [], 403);
    }
    if (error instanceof ApiError && error.statusCode === 404) {
      return errorResponse(message, [], 404);
    }
    if (error instanceof ApiError && error.statusCode !== 500) {
      return errorResponse(message, error.details, error.statusCode);
    }
    return errorResponse("Failed to generate the application PDF", [], 500);
  }
}
