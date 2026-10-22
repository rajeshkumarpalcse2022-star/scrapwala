import { getPublishedPostBySlug, getRelatedPublishedPosts } from "@/services/blog";
import {
  successResponse,
  errorResponse,
  errorResponseFromError,
} from "@/lib/utils/api-response";

export const dynamic = "force-dynamic";

/**
 * Public article detail. Unknown slugs and non-published articles both return
 * 404 — the response never reveals whether a draft exists.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const post = await getPublishedPostBySlug(slug);
    if (!post) {
      return errorResponse("Article not found", [], 404);
    }

    const related = await getRelatedPublishedPosts(post, 3);

    return successResponse("Article fetched successfully", { post, related });
  } catch (error) {
    return errorResponseFromError(error, "Failed to load the article");
  }
}
