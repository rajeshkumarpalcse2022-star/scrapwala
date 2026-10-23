import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { updateHomepageAdSchema } from "@/lib/validations/homepage-ad";
import {
  deleteHomepageAd,
  updateHomepageAd,
} from "@/services/homepage-ad";
import {
  successResponse,
  errorResponseFromError,
} from "@/lib/utils/api-response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
    const { id } = await params;
    const body = await request.json();
    const input = updateHomepageAdSchema.parse(body);
    const ad = await updateHomepageAd(id, input);
    return successResponse("Homepage ad updated successfully", { ad });
  } catch (error) {
    return errorResponseFromError(error, "Failed to update homepage ad");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
    const { id } = await params;
    await deleteHomepageAd(id);
    return successResponse("Homepage ad deleted successfully", { id });
  } catch (error) {
    return errorResponseFromError(error, "Failed to delete homepage ad");
  }
}
