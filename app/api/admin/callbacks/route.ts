import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { listCallbackRequestsSchema } from "@/lib/validations/callback";
import { listCallbackRequests } from "@/services/callback";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    await requireRole("admin");

    const { searchParams } = new URL(request.url);
    const input = listCallbackRequestsSchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });

    const result = await listCallbackRequests(input);
    return successResponse("Callback requests retrieved successfully", result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to retrieve callback requests";
    if (message.includes("Authentication required")) return errorResponse("Please login", [], 401);
    if (message.includes("Insufficient permissions")) return errorResponse("Admin access required", [], 403);
    return errorResponse(message, [], 500);
  }
}
