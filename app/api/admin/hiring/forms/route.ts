import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { createHiringFormSchema } from "@/lib/validations/hiring";
import {
  createHiringForm,
  listAdminHiringForms,
  defaultHiringFields,
} from "@/services/hiring";
import { successResponse } from "@/lib/utils/api-response";
import { hiringRouteError } from "@/lib/utils/hiring-route-error";

export async function GET() {
  try {
    await requireRole("admin");
    const forms = await listAdminHiringForms();
    return successResponse("Hiring forms fetched", { forms });
  } catch (error: unknown) {
    return hiringRouteError(error, "Failed to fetch hiring forms");
  }
}

/**
 * Creates a new form. When no fields are supplied, the default nine-field
 * hiring template is used so admins start from a working configuration.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireRole("admin");
    const body = await request.json().catch(() => null);

    const seedSchema = createHiringFormSchema.extend({
      fields: createHiringFormSchema.shape.fields.optional(),
    });
    const parsed = seedSchema.parse({
      ...(body ?? {}),
      fields: Array.isArray(body?.fields) && body.fields.length > 0
        ? body.fields
        : defaultHiringFields(),
    });

    const form = await createHiringForm(
      { ...parsed, fields: parsed.fields ?? defaultHiringFields() },
      admin.id
    );
    return successResponse("Hiring form created", { form }, 201);
  } catch (error: unknown) {
    return hiringRouteError(error, "Failed to create hiring form");
  }
}
