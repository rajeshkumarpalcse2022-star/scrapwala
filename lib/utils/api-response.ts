import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError } from "./api-error";

export function successResponse(
  messageOrData: string | Record<string, unknown>,
  data?: unknown,
  status: number = 200
) {
  if (typeof messageOrData === "string") {
    return NextResponse.json(
      { success: true, message: messageOrData, data },
      { status }
    );
  }
  return NextResponse.json(
    { success: true, ...messageOrData },
    { status }
  );
}

export function errorResponse(
  message: string,
  errorsOrStatus?: unknown[] | number,
  status?: number
) {
  if (typeof errorsOrStatus === "number") {
    return NextResponse.json(
      { success: false, message, errors: [] },
      { status: errorsOrStatus }
    );
  }
  return NextResponse.json(
    { success: false, message, errors: errorsOrStatus || [] },
    { status: status || 500 }
  );
}

/**
 * Shared error → response mapping for API routes.
 *
 * Handles ApiError (status + details), ZodError (first field message) and the
 * legacy message-based auth checks used across this codebase. Unexpected
 * failures are logged server-side and reported with a generic message so
 * internal details never reach the client.
 */
export function errorResponseFromError(
  error: unknown,
  fallbackMessage: string
) {
  if (error instanceof ZodError) {
    const first = error.issues?.[0];
    const message = first
      ? `${first.path.join(".") || "value"}: ${first.message}`
      : "Please provide valid input";
    return errorResponse(message, [], 400);
  }

  if (error instanceof ApiError) {
    return errorResponse(error.message, error.details, error.statusCode);
  }

  if (error instanceof Error) {
    const message = error.message;
    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Admin access required", [], 403);
    }
    console.error(`${fallbackMessage}:`, error);
    return errorResponse(fallbackMessage, [], 500);
  }

  return errorResponse(fallbackMessage, [], 500);
}
