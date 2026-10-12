import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { stageHiringUpload } from "@/services/hiring";
import HiringUpload from "@/models/HiringUpload";
import connectDB from "@/lib/db/mongoose";
import { destroyHiringAsset } from "@/services/cloudinary";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

const MAX_PENDING_UPLOADS = 12;

/**
 * Staged hiring document upload (photo / signature / resume). Files go to
 * Cloudinary as PRIVATE assets; only metadata + publicId are stored. The
 * application submission API later attaches uploads owned by the same
 * authenticated user — client-supplied URLs are never trusted.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole("user");
    await connectDB();

    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    const kindRaw = formData?.get("kind");

    if (!(file instanceof File)) {
      return errorResponse("Please choose a file to upload", [], 400);
    }

    const kind =
      kindRaw === "photo" || kindRaw === "signature" || kindRaw === "document"
        ? kindRaw
        : null;
    if (!kind) {
      return errorResponse(
        'Upload kind must be "photo", "signature" or "document"',
        [],
        400
      );
    }

    const pendingCount = await HiringUpload.countDocuments({
      user: user.id,
      application: null,
    });
    if (pendingCount >= MAX_PENDING_UPLOADS) {
      return errorResponse(
        "Too many pending uploads. Please reload the form and try again.",
        [],
        400
      );
    }

    const uploaded = await stageHiringUpload(file, user.id, kind);
    return successResponse("File uploaded successfully", uploaded, 201);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to upload file";

    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Only customers can upload documents", [], 403);
    }
    if (message.includes("not configured")) {
      return errorResponse(message, [], 503);
    }
    if (message.includes("MB") || message.includes("allowed") || message.includes("File")) {
      return errorResponse(message, [], 400);
    }
    if (message.includes("Cloudinary")) {
      return errorResponse(message, [], 502);
    }

    return errorResponse(message, [], 500);
  }
}

/**
 * Removes an unattached staged upload (applicant picked the wrong file).
 * Only the owning user's un-attached records can be deleted.
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireRole("user");
    await connectDB();

    const body = await request.json().catch(() => null);
    const uploadId = typeof body?.uploadId === "string" ? body.uploadId.trim() : "";
    if (!uploadId) {
      return errorResponse("Upload reference is missing", [], 400);
    }

    const record = await HiringUpload.findOne({
      _id: uploadId,
      user: user.id,
      application: null,
    });
    if (!record) {
      return errorResponse("Upload not found", [], 404);
    }

    const resourceType = record.mimeType === "application/pdf" ? "raw" : "image";
    await destroyHiringAsset(record.cloudinaryPublicId, resourceType);
    await record.deleteOne();

    return successResponse("Upload removed", { removed: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to remove upload";

    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Only customers can remove uploads", [], 403);
    }
    if (message.includes("Upload reference")) {
      return errorResponse(message, [], 400);
    }
    if (message.includes("Upload not found")) {
      return errorResponse(message, [], 404);
    }

    return errorResponse(message, [], 500);
  }
}
