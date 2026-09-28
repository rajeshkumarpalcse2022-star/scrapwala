import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireRole } from "@/lib/auth/require-auth";
import { createRateSchema } from "@/lib/validations/rate";
import { listAdminRates, createRate } from "@/services/rate";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET() {
  try {
    await requireRole("admin");

    const rates = await listAdminRates();

    return successResponse("Rates fetched successfully", { rates });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch rates";

    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Admin access required", [], 403);
    }

    return errorResponse(message, [], 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole("admin");

    const body = await request.json();
    const data = createRateSchema.parse(body);

    const rate = await createRate(data);

    return successResponse("Rate created successfully", { rate }, 201);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create rate";

    if (error instanceof ZodError) {
      const issue = error.issues[0];
      const detail =
        issue?.message && issue.message !== "Invalid input"
          ? issue.message
          : "Please select a subcategory and valid rates";
      return errorResponse(detail, [], 400);
    }
    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Admin access required", [], 403);
    }
    if (message.includes("Please select") || message.includes("already exists")) {
      return errorResponse(message, [], 400);
    }

    return errorResponse(message, [], 500);
  }
}
