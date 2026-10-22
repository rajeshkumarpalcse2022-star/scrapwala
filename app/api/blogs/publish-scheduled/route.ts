import crypto from "crypto";
import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { promoteDueScheduledPosts } from "@/services/blog";
import { revalidateBlogPages } from "@/lib/utils/revalidate-blog";
import { successResponse, errorResponse, errorResponseFromError } from "@/lib/utils/api-response";

export const dynamic = "force-dynamic";

const SECRET_HEADER = "x-blog-schedule-secret";

function secretsMatch(provided: string, expected: string): boolean {
  // Compare digests so mismatched lengths never leak through timing.
  const a = crypto.createHash("sha256").update(provided, "utf8").digest();
  const b = crypto.createHash("sha256").update(expected, "utf8").digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * Promotes scheduled articles whose real publication time has passed.
 *
 * The public queries also promote lazily on read, so articles always go live
 * on time even without a scheduler. This endpoint exists for a background
 * job/cron (e.g. Vercel Cron, system crontab) to flip statuses server-side:
 * invoke it with `x-blog-schedule-secret: <BLOG_SCHEDULE_SECRET>`.
 * Admins may also call it directly with their session.
 */
export async function POST(request: NextRequest) {
  try {
    const configuredSecret = process.env.BLOG_SCHEDULE_SECRET?.trim();
    const providedSecret = request.headers.get(SECRET_HEADER)?.trim();

    let authorized = false;

    if (configuredSecret && providedSecret && secretsMatch(providedSecret, configuredSecret)) {
      authorized = true;
    }

    if (!authorized) {
      try {
        await requireRole("admin");
        authorized = true;
      } catch {
        authorized = false;
      }
    }

    if (!authorized) {
      return errorResponse(
        configuredSecret
          ? "Invalid schedule secret"
          : "Scheduling endpoint is not configured: set BLOG_SCHEDULE_SECRET and call this route from your scheduler, or invoke it as an admin.",
        [],
        configuredSecret ? 401 : 503
      );
    }

    const promoted = await promoteDueScheduledPosts();
    revalidateBlogPages();

    return successResponse(
      promoted > 0
        ? `${promoted} scheduled article(s) published`
        : "No scheduled articles are due",
      { promoted }
    );
  } catch (error) {
    return errorResponseFromError(error, "Failed to publish scheduled articles");
  }
}
