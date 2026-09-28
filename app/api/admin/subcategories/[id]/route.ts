import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireRole } from "@/lib/auth/require-auth";
import { updateSubcategorySchema } from "@/lib/validations/category";
import { updateSubcategory, deleteSubcategory } from "@/services/category";
import { destroyAsset } from "@/services/cloudinary";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");

    const { id } = await params;
    const body = await request.json();
    const data = updateSubcategorySchema.parse(body);

    const result = await updateSubcategory(id, data);

    if (result.imageChanged && result.previousImagePublicId) {
      await destroyAsset(result.previousImagePublicId);
    }

    return successResponse("Subcategory updated successfully", {
      subcategory: result.subcategory,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update subcategory";

    if (error instanceof ZodError) {
      return errorResponse(
        "Please provide a valid name or description",
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
      return errorResponse("Subcategory not found", [], 404);
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
    const result = await deleteSubcategory(id);

    if (result.imagePublicId) {
      await destroyAsset(result.imagePublicId);
    }

    return successResponse("Subcategory deleted successfully", {
      deleted: true,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete subcategory";

    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Admin access required", [], 403);
    }
    if (message.includes("not found")) {
      return errorResponse("Subcategory not found", [], 404);
    }
    if (message.includes("Deactivate it instead")) {
      return errorResponse(message, [], 400);
    }

    return errorResponse(message, [], 500);
  }
}
