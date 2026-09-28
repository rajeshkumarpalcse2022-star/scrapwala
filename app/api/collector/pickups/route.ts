import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { getCollectorPickups } from "@/services/pickup";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole("collector");

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const status = searchParams.get("status") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    const result = await getCollectorPickups(user.id, {
      page: Math.max(1, page),
      limit: Math.min(Math.max(1, limit), 100),
      status,
      from,
      to,
    });

    return successResponse("Pickups retrieved successfully", result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to retrieve pickups";

    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Collector access required", [], 403);
    }
    if (message.includes("Invalid status value")) {
      return errorResponse("Invalid status filter", [], 400);
    }

    return errorResponse(message, [], 500);
  }
}
