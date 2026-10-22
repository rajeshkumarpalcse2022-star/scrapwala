import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { blogStatusActionSchema } from "@/lib/validations/blog";
import { setPostStatus } from "@/services/blog";
import { revalidateBlogPages } from "@/lib/utils/revalidate-blog";
import { successResponse, errorResponseFromError } from "@/lib/utils/api-response";

export const dynamic = "force-dynamic";

/**
 * Admin: publish / unpublish (archive) / schedule / return to draft.
 *
 * Body: `{ status: "draft" | "scheduled" | "published" | "archived",
 *          scheduledAt?: ISO string }` — `scheduledAt` is required (and must
 *          be in the future) when scheduling.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");

    const { id } = await params;
    const body = await request.json();
    const data = blogStatusActionSchema.parse(body);

    const post = await setPostStatus(id, data.status, data.scheduledAt);
    revalidateBlogPages([post.slug]);

    return successResponse(
      data.status === "published"
        ? "Article published"
        : data.status === "scheduled"
          ? `Article scheduled for ${new Date(post.scheduledAt ?? "").toLocaleString("en-IN")}`
          : data.status === "archived"
            ? "Article unpublished"
            : "Article moved to draft",
      { post }
    );
  } catch (error) {
    return errorResponseFromError(error, "Failed to update the article status");
  }
}
