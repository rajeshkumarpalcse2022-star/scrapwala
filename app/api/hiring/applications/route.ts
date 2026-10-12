import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireRole } from "@/lib/auth/require-auth";
import { submitHiringApplicationSchema } from "@/lib/validations/hiring";
import { createHiringApplication } from "@/services/hiring";
import { ApiError } from "@/lib/utils/api-error";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/**
 * Submit a hiring application against a published form. The server
 * re-validates every value against the current form configuration — the
 * client's validation is never trusted on its own.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole("user");
    const body = await request.json();
    const data = submitHiringApplicationSchema.parse(body);

    const result = await createHiringApplication({
      slug: data.slug,
      values: data.values,
      uploads: data.uploads,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userPhone: user.phone,
    });

    return successResponse("Application submitted successfully", result, 201);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to submit application";

    if (error instanceof ZodError) {
      return errorResponse("Please provide valid application details", [], 400);
    }
    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Only customers can submit applications", [], 403);
    }
    if (error instanceof ApiError && error.statusCode === 409) {
      return errorResponse(message, error.details, 409);
    }
    if (error instanceof ApiError && error.statusCode === 404) {
      return errorResponse(message, error.details, 404);
    }
    if (error instanceof ApiError && error.statusCode !== 500) {
      return errorResponse(message, error.details, error.statusCode);
    }
    return errorResponse(message, [], 500);
  }
}
