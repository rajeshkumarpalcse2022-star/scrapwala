import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireRole } from "@/lib/auth/require-auth";
import { createLocationSchema } from "@/lib/validations/location";
import { listLocations, createLocation } from "@/services/location";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET() {
  try {
    await requireRole("admin");

    const locations = await listLocations();

    return successResponse("Locations fetched successfully", { locations });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch locations";

    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Admin access required", [], 403);
    }

    return errorResponse(message, [], 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole("admin");

    const body = await request.json();
    const data = createLocationSchema.parse(body);

    const location = await createLocation(data);

    return successResponse("Location created successfully", { location }, 201);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create location";

    if (error instanceof ZodError) {
      return errorResponse(
        "Please provide a valid name, city, state and at least one 6-digit PIN code",
        [],
        400
      );
    }
    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Admin access required", [], 403);
    }
    if (message.includes("PIN code")) {
      return errorResponse(message, [], 400);
    }

    return errorResponse(message, [], 500);
  }
}
