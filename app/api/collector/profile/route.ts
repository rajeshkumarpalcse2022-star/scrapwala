import { requireRole } from "@/lib/auth/require-auth";
import connectDB from "@/lib/db/mongoose";
import User from "@/models/User";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET() {
  try {
    // Identity comes strictly from the server-side session (JWT sub).
    const sessionUser = await requireRole("collector");

    await connectDB();

    const user = await User.findById(sessionUser.id)
      .select("name email phone role collectorId isActive isVerified createdAt")
      .lean();

    if (!user) {
      return errorResponse("Collector account not found", [], 404);
    }

    return successResponse("Profile retrieved successfully", {
      collector: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        collectorId: user.collectorId,
        isActive: user.isActive,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to retrieve profile";

    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401);
    }
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Collector access required", [], 403);
    }

    return errorResponse(message, [], 500);
  }
}
