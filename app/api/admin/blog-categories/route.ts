import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { createBlogCategorySchema } from "@/lib/validations/blog";
import { createBlogCategory, listAdminBlogCategories } from "@/services/blog";
import { revalidateBlogPages } from "@/lib/utils/revalidate-blog";
import { successResponse, errorResponseFromError } from "@/lib/utils/api-response";

export const dynamic = "force-dynamic";

/** Admin: all blog categories (including archived) with article counts. */
export async function GET() {
  try {
    await requireRole("admin");

    const categories = await listAdminBlogCategories();
    return successResponse("Categories fetched successfully", { categories });
  } catch (error) {
    return errorResponseFromError(error, "Failed to load categories");
  }
}

/** Admin: create a blog category. */
export async function POST(request: NextRequest) {
  try {
    await requireRole("admin");

    const body = await request.json();
    const data = createBlogCategorySchema.parse(body);

    const category = await createBlogCategory(data);
    revalidateBlogPages();

    return successResponse("Category created successfully", { category }, 201);
  } catch (error) {
    return errorResponseFromError(error, "Failed to create the category");
  }
}
