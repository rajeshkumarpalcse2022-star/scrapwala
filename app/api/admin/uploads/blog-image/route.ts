import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { uploadBlogImage, blogImageLimits, BLOG_ACCEPT_LABEL } from "@/services/cloudinary";
import {
  successResponse,
  errorResponse,
  errorResponseFromError,
} from "@/lib/utils/api-response";

export const dynamic = "force-dynamic";

/**
 * Admin-only blog image upload (cover / inline / social).
 *
 * Runs entirely server-side: file type, size and real file content are
 * validated before the Cloudinary upload is signed with the API secret.
 * Returns `{ imageUrl, cloudinaryPublicId }`.
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole("admin");

    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");

    if (!(file instanceof File)) {
      return errorResponse("Please choose an image to upload", [], 400);
    }

    const limits = blogImageLimits();
    if (file.size > limits.maxBytes) {
      return errorResponse("Image must be smaller than 5 MB", [], 400);
    }
    if (!limits.mimeTypes.includes(file.type)) {
      return errorResponse(`Only ${BLOG_ACCEPT_LABEL} images are allowed`, [], 400);
    }

    const uploaded = await uploadBlogImage(file);

    return successResponse("Image uploaded successfully", uploaded, 201);
  } catch (error) {
    return errorResponseFromError(error, "Failed to upload the image");
  }
}
