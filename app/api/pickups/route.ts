import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireRole } from "@/lib/auth/require-auth";
import { createPickupSchema } from "@/lib/validations/pickup";
import { createPickup, getCustomerPickups } from "@/services/pickup";
import { ApiError } from "@/lib/utils/api-error";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole("user");

    const body = await request.json();
    const data = createPickupSchema.parse(body);

    const pickup = await createPickup(data, user.id);

    const safePickup = {
      pickupId: pickup.pickupId,
      status: pickup.status,
      vehicle: pickup.vehicle,
      scheduledDate: pickup.scheduledDate,
      timeSlot: pickup.timeSlot,
      address: pickup.address,
      items: pickup.items.map((item) => ({
        categoryName: item.categoryName,
        rate: item.rate,
        unit: item.unit,
        estimatedWeight: item.estimatedWeight,
        amount: item.amount,
      })),
      expectedWeight: pickup.expectedWeight,
      estimatedAmount: pickup.estimatedAmount,
      notes: pickup.notes,
      createdAt: pickup.createdAt,
    };

    return successResponse("Pickup created successfully", safePickup, 201);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create pickup";

    if (error instanceof ZodError) {
      return errorResponse("Please provide valid pickup details", [], 400);
    }
    if (error instanceof ApiError && error.statusCode !== 500) {
      return errorResponse(message, [], error.statusCode);
    }
    if (message.includes("Authentication required")) {
      return errorResponse("Please login to book a pickup", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Only users can book pickups", [], 403);
    }

    return errorResponse(message, [], 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole("user");

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const status = searchParams.get("status") || undefined;

    const result = await getCustomerPickups(user.id, {
      page: Math.max(1, page),
      limit: Math.min(Math.max(1, limit), 50),
      status: status || undefined,
    });

    return successResponse("Pickups retrieved successfully", result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to retrieve pickups";

    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Only users can view pickups", [], 403);
    }

    return errorResponse(message, [], 500);
  }
}
