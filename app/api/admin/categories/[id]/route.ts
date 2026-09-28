import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireRole } from "@/lib/auth/require-auth";
import { updateCategorySchema } from "@/lib/validations/category";
import { updateCategory, deleteCategory } from "@/services/category";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");

    const { id } = await params;
    const body = await request.json();
    const data = updateCategorySchema.parse(body);

    const category = await updateCategory(id, data);

    return successResponse("Category updated successfully", { category });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update category";

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
    if (message.includes("not found")) {
      return errorResponse("Category not found", [], 404);
    }
    if (message.includes("already exists")) {
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
    await deleteCategory(id);

    return successResponse("Category deleted successfully", { deleted: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete category";

    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Admin access required", [], 403);
    }
    if (message.includes("not found")) {
      return errorResponse("Category not found", [], 404);
    }
    if (message.includes("subcategor")) {
      return errorResponse(message, [], 400);
    }

    return errorResponse(message, [], 500);
  }
}
