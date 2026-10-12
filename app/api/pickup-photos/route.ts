import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { destroyAsset, uploadPickupPhoto } from "@/services/cloudinary";
import PickupPhotoUpload from "@/models/PickupPhotoUpload";
import connectDB from "@/lib/db/mongoose";
import { PICKUP_PHOTO_MAX_COUNT } from "@/lib/constants/pickup";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/**
 * Customer scrap-photo staging upload. Photos are uploaded to Cloudinary
 * while the pickup is being filled in; the booking API later attaches only
 * staged photos owned by the same authenticated customer.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole("user");
    await connectDB();

    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    const uploadSessionId =
      typeof formData?.get("uploadSessionId") === "string"
        ? String(formData.get("uploadSessionId")).trim()
        : "";

    if (!(file instanceof File)) {
      return errorResponse("Please choose an image to upload", [], 400);
    }

    if (!uploadSessionId) {
      return errorResponse("Photo upload session is missing", [], 400);
    }

    // Cap applies per booking-form session, not per customer lifetime, so
    // abandoned uploads from earlier attempts never block a new pickup.
    const pendingCount = await PickupPhotoUpload.countDocuments({
      customer: user.id,
      uploadSessionId,
      pickup: null,
    });
    if (pendingCount >= PICKUP_PHOTO_MAX_COUNT) {
      return errorResponse(
        `You can upload up to ${PICKUP_PHOTO_MAX_COUNT} photos per pickup.`,
        [],
        400
      );
    }

    const uploaded = await uploadPickupPhoto(file);

    await PickupPhotoUpload.create({
      customer: user.id,
      url: uploaded.imageUrl,
      publicId: uploaded.cloudinaryPublicId,
      uploadSessionId,
      // Orphan cleanup: abandoned (never booked) uploads expire automatically.
      purgeAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return successResponse("Photo uploaded successfully", uploaded, 201);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to upload photo";

    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Only customers can upload photos", [], 403);
    }
    if (message.includes("not configured")) {
      return errorResponse(message, [], 503);
    }
    if (
      message.includes("MB") ||
      message.includes("JPEG") ||
      message.includes("image") ||
      message.includes("File")
    ) {
      return errorResponse(message, [], 400);
    }
    if (message.includes("Cloudinary")) {
      return errorResponse(message, [], 502);
    }

    return errorResponse(message, [], 500);
  }
}

/**
 * Removes an unattached staged photo (customer changed their mind before
 * booking). Only the owning customer's un-attached records can be deleted;
 * photos already on a confirmed pickup are never touched.
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireRole("user");
    await connectDB();

    const body = await request.json().catch(() => null);
    const publicId =
      typeof body?.publicId === "string" ? body.publicId.trim() : "";

    if (!publicId) {
      return errorResponse("Photo reference is missing", [], 400);
    }

    const record = await PickupPhotoUpload.findOne({
      customer: user.id,
      publicId,
      pickup: null,
    });

    if (!record) {
      return errorResponse("Photo not found", [], 404);
    }

    await destroyAsset(record.publicId);
    await record.deleteOne();

    return successResponse("Photo removed", { removed: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to remove photo";

    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Only customers can remove photos", [], 403);
    }
    if (message.includes("Photo reference")) {
      return errorResponse(message, [], 400);
    }
    if (message.includes("Photo not found")) {
      return errorResponse(message, [], 404);
    }

    return errorResponse(message, [], 500);
  }
}
