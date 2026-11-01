import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { getAdminReport, isReportPeriod } from "@/services/report";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    await requireRole("admin");

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") ?? "30d";

    if (!isReportPeriod(period)) {
      return errorResponse("Invalid period value", [], 400);
    }

    const report = await getAdminReport(period);

    return successResponse("Report retrieved successfully", report);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to retrieve report";

    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Admin access required", [], 403);
    }

    return errorResponse(message, [], 500);
  }
}
