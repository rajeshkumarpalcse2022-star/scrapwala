import { NextRequest } from "next/server";
import { listPublicSubcategories } from "@/services/category";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const subcategories = await listPublicSubcategories(id);

    return successResponse("Subcategories fetched successfully", {
      subcategories,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch subcategories";

    if (message.includes("not found")) {
      return errorResponse("Category not found", [], 404);
    }

    return errorResponse(message, [], 500);
  }
}
