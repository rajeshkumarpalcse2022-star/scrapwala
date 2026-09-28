import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireRole } from "@/lib/auth/require-auth";
import { createSubcategorySchema } from "@/lib/validations/category";
import { createSubcategory } from "@/services/category";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");

    const { id } = await params;
    const body = await request.json();
    const data = createSubcategorySchema.parse(body);

    const subcategory = await createSubcategory(id, data);

    return successResponse("Subcategory created successfully", { subcategory }, 201);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create subcategory";

    if (error instanceof ZodError) {
      return errorResponse(
        "Please provide a name, description and uploaded SVG image",
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
    if (message.includes("inactive") || message.includes("already exists")) {
      return errorResponse(message, [], 400);
    }

    return errorResponse(message, [], 500);
  }
}
