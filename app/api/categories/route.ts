import { listPublicCategories } from "@/services/category";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET() {
  try {
    const categories = await listPublicCategories();

    return successResponse("Categories fetched successfully", { categories });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch categories";

    return errorResponse(message, [], 500);
  }
}
