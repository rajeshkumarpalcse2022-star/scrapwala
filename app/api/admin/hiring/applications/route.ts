import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { listHiringApplicationsSchema } from "@/lib/validations/hiring";
import { listHiringApplications } from "@/services/hiring";
import { successResponse } from "@/lib/utils/api-response";
import { hiringRouteError } from "@/lib/utils/hiring-route-error";

/** Paginated list of submitted applications (admin only). */
export async function GET(request: NextRequest) {
  try {
    await requireRole("admin");
    const { searchParams } = new URL(request.url);
    const params = listHiringApplicationsSchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      formId: searchParams.get("formId") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });
    const result = await listHiringApplications(params);
    return successResponse("Applications fetched", result);
  } catch (error: unknown) {
    return hiringRouteError(error, "Failed to fetch applications");
  }
}
