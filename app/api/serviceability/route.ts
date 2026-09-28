import { NextRequest } from "next/server";
import {
  checkServiceability,
  checkServiceabilityByLocation,
} from "@/services/location";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/**
 * Public serviceability check used by the pickup booking flow.
 * Reads the same MongoDB Location collection the Admin panel writes to.
 * Returns serviceability only — no admin/internal location management data.
 *
 * With latitude/longitude params the check is coordinate-authoritative
 * (server-side geometric validation, spec §7); otherwise the legacy
 * PIN-code check applies.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pinCode = searchParams.get("pinCode") ?? "";
    const latParam = searchParams.get("latitude");
    const lngParam = searchParams.get("longitude");

    let result;
    if (latParam !== null && lngParam !== null) {
      const latitude = Number(latParam);
      const longitude = Number(lngParam);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return errorResponse("Invalid coordinates", [], 400);
      }

      result = await checkServiceabilityByLocation(
        latitude,
        longitude,
        pinCode || undefined
      );
    } else {
      result = await checkServiceability(pinCode);
    }

    return successResponse("Serviceability checked successfully", result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to check serviceability";

    if (message.includes("PIN code") || message.includes("coordinates")) {
      return errorResponse(message, [], 400);
    }

    return errorResponse("Failed to check serviceability. Please try again.", [], 500);
  }
}
