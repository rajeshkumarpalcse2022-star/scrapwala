import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { getActiveHomepageAd } from "@/services/homepage-ad";

/** Public: the ad currently live on the homepage (or null). */
export async function GET() {
  try {
    const ad = await getActiveHomepageAd();
    return successResponse("Homepage ad retrieved successfully", { ad });
  } catch (error) {
    console.error("Failed to load homepage ad:", error);
    return errorResponse("Failed to load homepage ad", [], 500);
  }
}
