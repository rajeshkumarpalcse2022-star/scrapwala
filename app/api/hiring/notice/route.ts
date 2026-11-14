import { requireRole } from "@/lib/auth/require-auth";
import { getHiringNotice } from "@/services/hiring-notice";
import { successResponse } from "@/lib/utils/api-response";
import { hiringRouteError } from "@/lib/utils/hiring-route-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("user");
    const notice = await getHiringNotice();
    return successResponse("Hiring notice fetched", { notice });
  } catch (error) {
    return hiringRouteError(error, "Failed to fetch the hiring notice");
  }
}
