import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { getApplicationDocumentDeliveryUrl } from "@/services/hiring";
import { hiringRouteError } from "@/lib/utils/hiring-route-error";

/**
 * Admin access to a private applicant document. Redirects to a short-lived
 * signed Cloudinary URL after the admin role is verified server-side.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; fieldKey: string }> }
) {
  try {
    await requireRole("admin");
    const { id, fieldKey } = await params;
    const document = await getApplicationDocumentDeliveryUrl(id, fieldKey);
    return NextResponse.redirect(document.url, 302);
  } catch (error: unknown) {
    return hiringRouteError(error, "Failed to access document");
  }
}
