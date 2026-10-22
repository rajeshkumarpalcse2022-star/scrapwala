import { listPublicBlogCategories } from "@/services/blog";
import { successResponse, errorResponseFromError } from "@/lib/utils/api-response";

export const dynamic = "force-dynamic";

/** Public blog categories (active only) with published-article counts. */
export async function GET() {
  try {
    const categories = await listPublicBlogCategories();
    return successResponse("Categories fetched successfully", { categories });
  } catch (error) {
    return errorResponseFromError(error, "Failed to load categories");
  }
}
