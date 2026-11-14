import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import {
  HIRING_NOTICE_ACCEPT_LABEL,
  hiringNoticeImageLimits,
  uploadHiringNoticeImage,
} from "@/services/cloudinary";
import {
  deleteHiringNotice,
  getHiringNotice,
  saveHiringNoticeImage,
} from "@/services/hiring-notice";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { hiringRouteError } from "@/lib/utils/hiring-route-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("admin");
    const notice = await getHiringNotice();
    return successResponse("Hiring notice fetched", { notice });
  } catch (error) {
    return hiringRouteError(error, "Failed to fetch the hiring notice");
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireRole("admin");
    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");

    if (!(file instanceof File)) {
      return errorResponse("Please choose a notice image", [], 400);
    }

    const limits = hiringNoticeImageLimits();
    if (file.size > limits.maxBytes) {
      return errorResponse("Notice image must be smaller than 5 MB", [], 400);
    }
    if (!limits.mimeTypes.includes(file.type)) {
      return errorResponse(
        `Only ${HIRING_NOTICE_ACCEPT_LABEL} images are allowed`,
        [],
        400
      );
    }

    const uploaded = await uploadHiringNoticeImage(file);
    const notice = await saveHiringNoticeImage(
      {
        imageUrl: uploaded.imageUrl,
        publicId: uploaded.cloudinaryPublicId,
      },
      admin.id
    );

    return successResponse("Notice image saved", { notice }, 201);
  } catch (error) {
    return hiringRouteError(error, "Failed to save the notice image");
  }
}

export async function DELETE() {
  try {
    await requireRole("admin");
    await deleteHiringNotice();
    return successResponse("Notice image removed", { notice: null });
  } catch (error) {
    return hiringRouteError(error, "Failed to remove the notice image");
  }
}
