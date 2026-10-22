import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { blogFeatureSchema } from "@/lib/validations/blog";
import { setPostFeatured } from "@/services/blog";
import { revalidateBlogPages } from "@/lib/utils/revalidate-blog";
import { successResponse, errorResponseFromError } from "@/lib/utils/api-response";

export const dynamic = "force-dynamic";

/** Admin: feature / unfeature an article on the public blog hero. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");

    const { id } = await params;
    const body = await request.json();
    const data = blogFeatureSchema.parse(body);

    const post = await setPostFeatured(id, data.isFeatured);
    revalidateBlogPages([post.slug]);

    return successResponse(
      data.isFeatured ? "Article featured on the blog page" : "Article removed from featured",
      { post }
    );
  } catch (error) {
    return errorResponseFromError(error, "Failed to update the featured article");
  }
}
