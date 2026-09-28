import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireRole } from "@/lib/auth/require-auth";
import { createCategorySchema } from "@/lib/validations/category";
import { listAdminCategories, createCategory } from "@/services/category";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET() {
  try {
    await requireRole("admin");

    const categories = await listAdminCategories();

    return successResponse("Categories fetched successfully", { categories });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch categories";

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
    const data = createCategorySchema.parse(body);

    const category = await createCategory(data);

    return successResponse("Category created successfully", { category }, 201);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create category";

    if (error instanceof ZodError) {
      return errorResponse(
        "Please provide a category name (at least 2 characters)",
        [],
        400
      );
    }
    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Admin access required", [], 403);
    }
    if (message.includes("already exists")) {
      return errorResponse(message, [], 400);
    }

    return errorResponse(message, [], 500);
  }
}
