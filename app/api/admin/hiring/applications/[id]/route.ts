import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { updateHiringApplicationStatusSchema } from "@/lib/validations/hiring";
import {
  deleteHiringApplication,
  getHiringApplicationDetail,
  updateHiringApplicationStatus,
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
    const application = await getHiringApplicationDetail(id);
    return successResponse("Application fetched", { application });
  } catch (error: unknown) {
    return hiringRouteError(error, "Failed to fetch application");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
    const { id } = await params;
    const body = await request.json();
    const { status } = updateHiringApplicationStatusSchema.parse(body);
    const result = await updateHiringApplicationStatus(id, status);
    return successResponse("Application status updated", result);
  } catch (error: unknown) {
    return hiringRouteError(error, "Failed to update application status");
  }
}

/**
 * Admin deletion of an application. Associated uploaded assets are cleaned
 * up best-effort; database deletion is the source of truth.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
    const { id } = await params;
    await deleteHiringApplication(id);
    return successResponse("Application deleted", { deleted: true });
  } catch (error: unknown) {
    return hiringRouteError(error, "Failed to delete application");
  }
}
