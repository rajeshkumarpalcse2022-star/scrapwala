import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError } from "@/lib/utils/api-error";
import { errorResponse } from "@/lib/utils/api-response";

/**
 * Shared catch-chain mapper for hiring API routes, following the project's
 * existing response conventions (ZodError → 400, auth messages → 401/403,
 * ApiError with its own status, else the fallback 500).
 */
export function hiringRouteError(
  error: unknown,
  fallbackMessage: string
): NextResponse {
  const message = error instanceof Error ? error.message : fallbackMessage;

  if (error instanceof ZodError) {
    const firstIssue = error.issues?.[0];
    const detail = firstIssue?.message
      ? `${firstIssue.path?.join(".") ? `${firstIssue.path.join(".")}: ` : ""}${firstIssue.message}`
      : "Please provide valid details";
    return errorResponse(detail, [], 400);
  }
  if (message.includes("Authentication required")) {
    return errorResponse("Please login", [], 401);
  }
  if (message.includes("Insufficient permissions")) {
    return errorResponse("Admin access required", [], 403);
  }
  if (error instanceof ApiError && error.statusCode !== 500) {
    return errorResponse(message, error.details, error.statusCode);
  }
  return errorResponse(message, [], 500);
}
