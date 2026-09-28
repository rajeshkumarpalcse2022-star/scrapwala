import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireRole } from "@/lib/auth/require-auth";
import { updateRateSchema } from "@/lib/validations/rate";
import { updateRate, deleteRate } from "@/services/rate";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");

    const { id } = await params;
    const body = await request.json();
    const data = updateRateSchema.parse(body);

    const rate = await updateRate(id, data);

    return successResponse("Rate updated successfully", { rate });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update rate";

    if (error instanceof ZodError) {
      const issue = error.issues[0];
      const detail =
        issue?.message && issue.message !== "Invalid input"
          ? issue.message
          : "Please provide valid rate values";
      return errorResponse(detail, [], 400);
    }
    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Admin access required", [], 403);
    }
    if (message.includes("not found")) {
      return errorResponse("Rate not found", [], 404);
    }
    if (
      message.includes("already exists") ||
      message.includes("Maximum rate") ||
      message.includes("Please select")
    ) {
      return errorResponse(message, [], 400);
    }

    return errorResponse(message, [], 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");

    const { id } = await params;
    await deleteRate(id);

    return successResponse("Rate deleted successfully", { deleted: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete rate";

    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Admin access required", [], 403);
    }
    if (message.includes("not found")) {
      return errorResponse("Rate not found", [], 404);
    }

    return errorResponse(message, [], 500);
  }
}
