import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { buildApplicationPdf } from "@/services/hiring";
import { hiringRouteError } from "@/lib/utils/hiring-route-error";
import { errorResponse } from "@/lib/utils/api-response";

/** Admin download of the same application summary PDF the applicant gets. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
    const { id } = await params;
    const { buffer, fileName } = await buildApplicationPdf(id);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    const mapped = hiringRouteError(error, "Failed to generate PDF");
    if (mapped.status === 500) {
      return errorResponse("Failed to generate the application PDF", [], 500);
    }
    return mapped;
  }
}
