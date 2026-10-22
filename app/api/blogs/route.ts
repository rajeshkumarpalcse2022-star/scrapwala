import type { NextRequest } from "next/server";
import { publicBlogQuerySchema } from "@/lib/validations/blog";
import { listPublishedPosts } from "@/services/blog";
import { successResponse, errorResponseFromError } from "@/lib/utils/api-response";

export const dynamic = "force-dynamic";

/**
 * Public article listing. Only eligible published articles are returned —
 * drafts, scheduled (not yet due), archived posts never appear.
 *
 * Query: `page`, `limit` (≤24), `category` (slug), `q` (search text).
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const query = publicBlogQuerySchema.parse({
      page: params.get("page") ?? undefined,
      limit: params.get("limit") ?? undefined,
      category: params.get("category") || undefined,
      q: params.get("q") || undefined,
    });

    const result = await listPublishedPosts(query);

    return successResponse("Articles fetched successfully", result);
  } catch (error) {
    return errorResponseFromError(error, "Failed to load articles");
  }
}
