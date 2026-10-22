import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { updateBlogSchema } from "@/lib/validations/blog";
import { deletePost, getAdminPost, updatePost } from "@/services/blog";
import { revalidateBlogPages } from "@/lib/utils/revalidate-blog";
import { successResponse, errorResponseFromError } from "@/lib/utils/api-response";

export const dynamic = "force-dynamic";

/** Admin: full article detail (including content) for the editor/preview. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");

    const { id } = await params;
    const post = await getAdminPost(id);

    return successResponse("Article fetched successfully", { post });
  } catch (error) {
    return errorResponseFromError(error, "Failed to load the article");
  }
}

/** Admin: update an article (content, status, scheduling, feature flag…). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");

    const { id } = await params;
    const body = await request.json();
    const data = updateBlogSchema.parse(body);

    const post = await updatePost(id, data);
    revalidateBlogPages([post.slug]);

    return successResponse("Article updated successfully", { post });
  } catch (error) {
    return errorResponseFromError(error, "Failed to update the article");
  }
}

/** Admin: permanently delete an article (its images are cleaned up too). */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");

    const { id } = await params;
    const { slug } = await deletePost(id);
    revalidateBlogPages([slug]);

    return successResponse("Article deleted successfully", { deleted: true });
  } catch (error) {
    return errorResponseFromError(error, "Failed to delete the article");
  }
}
