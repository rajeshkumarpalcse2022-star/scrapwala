import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { updateCallbackRequestSchema } from "@/lib/validations/callback";
import { updateCallbackStatus } from "@/services/callback";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
    const { id } = await params;
    const body = await request.json();
    const { status } = updateCallbackRequestSchema.parse(body);
    const result = await updateCallbackStatus(id, status);
    return successResponse("Callback request updated", result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update callback request";
    if (message.includes("Authentication required")) return errorResponse("Please login", [], 401);
    if (message.includes("Insufficient permissions")) return errorResponse("Admin access required", [], 403);
    if (message.includes("not found")) return errorResponse(message, [], 404);
    return errorResponse(message, [], 500);
  }
}
