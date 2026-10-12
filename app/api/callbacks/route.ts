import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { createCallbackRequestSchema } from "@/lib/validations/callback";
import { createCallbackRequest } from "@/services/callback";
import { getAuthenticatedUser } from "@/lib/auth/require-auth";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createCallbackRequestSchema.parse(body);

    // Guests can request a callback; attach the user only when logged in.
    const user = await getAuthenticatedUser().catch(() => null);
    const result = await createCallbackRequest(data, user?.id);

    return successResponse(
      "Callback request submitted. Our team will call you back shortly.",
      result,
      201
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const first = error.issues?.[0];
      return errorResponse(first?.message || "Please provide valid details", [], 400);
    }
    const message =
      error instanceof Error ? error.message : "Failed to submit callback request";
    return errorResponse(message, [], 500);
  }
}
