import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { updateHiringFormSchema } from "@/lib/validations/hiring";
import {
  deleteHiringForm,
  getAdminHiringForm,
  updateHiringForm,
} from "@/services/hiring";
import { successResponse } from "@/lib/utils/api-response";
import { hiringRouteError } from "@/lib/utils/hiring-route-error";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
    const { id } = await params;
    const form = await getAdminHiringForm(id);
    return successResponse("Hiring form fetched", { form });
  } catch (error: unknown) {
    return hiringRouteError(error, "Failed to fetch hiring form");
  }
}

/**
 * Full form update. The slug generated at creation is preserved so already
 * shared application URLs keep working after edits.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
    const { id } = await params;
    const body = await request.json();
    const data = updateHiringFormSchema.parse(body);
    const form = await updateHiringForm(id, data);
    return successResponse("Hiring form updated", { form });
  } catch (error: unknown) {
    return hiringRouteError(error, "Failed to update hiring form");
  }
}

/**
 * Deleting is blocked while applications exist (409) so recruitment records
 * are never destroyed by accident — close the form instead.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
    const { id } = await params;
    await deleteHiringForm(id);
    return successResponse("Hiring form deleted", { deleted: true });
  } catch (error: unknown) {
    return hiringRouteError(error, "Failed to delete hiring form");
  }
}
