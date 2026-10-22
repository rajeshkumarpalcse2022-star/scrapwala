import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { updateBlogCategorySchema } from "@/lib/validations/blog";
import { deleteBlogCategory, updateBlogCategory } from "@/services/blog";
import { revalidateBlogPages } from "@/lib/utils/revalidate-blog";
import { successResponse, errorResponseFromError } from "@/lib/utils/api-response";

export const dynamic = "force-dynamic";

/** Admin: update a blog category (rename, slug, description, archive/restore). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");

    const { id } = await params;
    const body = await request.json();
    const data = updateBlogCategorySchema.parse(body);

    const category = await updateBlogCategory(id, data);
    revalidateBlogPages();

    return successResponse("Category updated successfully", { category });
  } catch (error) {
    return errorResponseFromError(error, "Failed to update the category");
  }
}

/**
 * Admin: delete a blog category. Categories with articles are rejected with
 * a clear message (archive instead) so posts are never orphaned.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");

    const { id } = await params;
    await deleteBlogCategory(id);
    revalidateBlogPages();

    return successResponse("Category deleted successfully", { deleted: true });
  } catch (error) {
    return errorResponseFromError(error, "Failed to delete the category");
  }
}
