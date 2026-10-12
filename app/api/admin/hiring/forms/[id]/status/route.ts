import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-auth";
import { setHiringFormStatus } from "@/services/hiring";
import { successResponse } from "@/lib/utils/api-response";
import { hiringRouteError } from "@/lib/utils/hiring-route-error";

const statusSchema = z.object({
  status: z.enum(["draft", "published", "closed"]),
});

/**
 * Form lifecycle transitions:
 *   draft → published (validates the field configuration first)
 *   published → closed (existing applications stay intact)
 *   closed → published (reopen)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
    const { id } = await params;
    const body = await request.json();
    const { status } = statusSchema.parse(body);
    const form = await setHiringFormStatus(id, status);
    return successResponse(`Hiring form marked as ${status}`, { form });
  } catch (error: unknown) {
    return hiringRouteError(error, "Failed to update hiring form status");
  }
}
