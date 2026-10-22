import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { createBlogSchema, adminBlogQuerySchema } from "@/lib/validations/blog";
import { createPost, listAdminPosts } from "@/services/blog";
import { revalidateBlogPages } from "@/lib/utils/revalidate-blog";
import { successResponse, errorResponseFromError } from "@/lib/utils/api-response";

export const dynamic = "force-dynamic";

/** Admin: paginated article list with search/category/status filters. */
export async function GET(request: NextRequest) {
  try {
    await requireRole("admin");

    const params = request.nextUrl.searchParams;
    const query = adminBlogQuerySchema.parse({
      page: params.get("page") ?? undefined,
      limit: params.get("limit") ?? undefined,
      q: params.get("q") || undefined,
      category: params.get("category") || undefined,
      status: params.get("status") || undefined,
    });

    const result = await listAdminPosts(query);

    return successResponse("Articles fetched successfully", result);
  } catch (error) {
    return errorResponseFromError(error, "Failed to load articles");
  }
}

/** Admin: create an article (draft by default, or publish/schedule directly). */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireRole("admin");

    const body = await request.json();
    const data = createBlogSchema.parse(body);

    const post = await createPost(data, admin.id);
    revalidateBlogPages([post.slug]);

    return successResponse("Article created successfully", { post }, 201);
  } catch (error) {
    return errorResponseFromError(error, "Failed to create the article");
  }
}
