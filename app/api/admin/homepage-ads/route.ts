import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-auth";
import { createHomepageAdSchema } from "@/lib/validations/homepage-ad";
import {
  createHomepageAd,
  listHomepageAds,
} from "@/services/homepage-ad";
import {
  successResponse,
  errorResponseFromError,
} from "@/lib/utils/api-response";

export async function GET() {
  try {
    await requireRole("admin");
    const ads = await listHomepageAds();
    return successResponse("Homepage ads retrieved successfully", { ads });
  } catch (error) {
    return errorResponseFromError(error, "Failed to retrieve homepage ads");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole("admin");
    const body = await request.json();
    const input = createHomepageAdSchema.parse(body);
    const ad = await createHomepageAd(input, user.id);
    return successResponse("Homepage ad created successfully", { ad }, 201);
  } catch (error) {
    return errorResponseFromError(error, "Failed to create homepage ad");
  }
}
