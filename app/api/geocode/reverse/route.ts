import { NextRequest } from "next/server";
import { reverseGeocode } from "@/services/geocode";
import { ApiError } from "@/lib/utils/api-error";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/**
 * Public reverse-geocoding endpoint used by pickup Step 2 (Location).
 *
 * Maps latitude/longitude → { city, state, pinCode } via the server-side
 * Nominatim proxy (throttled + cached — see services/geocode). Values may be
 * empty strings when the provider cannot resolve a field; clients must treat
 * missing values as "user enters manually" and never as an error.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latitude = Number(searchParams.get("latitude"));
    const longitude = Number(searchParams.get("longitude"));

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return errorResponse("Invalid coordinates", [], 400);
    }

    const result = await reverseGeocode(latitude, longitude);

    return successResponse("Location resolved successfully", result);
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      return errorResponse(error.message, [], error.statusCode);
    }

    // Upstream/unknown failure — the client keeps coordinates and asks the
    // user to fill city/state/PIN manually.
    return errorResponse(
      "We couldn't look up this location right now. Please try again.",
      [],
      502
    );
  }
}
