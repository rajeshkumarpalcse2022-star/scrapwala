import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { uploadSvg } from "@/services/cloudinary";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function POST(request: NextRequest) {
  try {
    await requireRole("admin");

    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");

    if (!(file instanceof File)) {
      return errorResponse("Please choose an SVG file to upload", [], 400);
    }

    const uploaded = await uploadSvg(file);

    return successResponse("Image uploaded successfully", uploaded, 201);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to upload image";

    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Admin access required", [], 403);
    }
    if (message.includes("not configured")) {
      return errorResponse(message, [], 503);
    }
    if (
      message.includes("SVG") ||
      message.includes("svg") ||
      message.includes("MB") ||
      message.includes("file")
    ) {
      return errorResponse(message, [], 400);
    }
    if (message.includes("Cloudinary")) {
      return errorResponse(message, [], 502);
    }

    return errorResponse(message, [], 500);
  }
}
