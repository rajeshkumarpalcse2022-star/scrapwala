import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { requireRole } from "@/lib/auth/require-auth";
import connectDB from "@/lib/db/mongoose";
import Notification from "@/models/Notification";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

function authError(message: string) {
  if (message.includes("Authentication required")) {
    return errorResponse("Please login", [], 401);
  }
  if (message.includes("Insufficient permissions")) {
    return errorResponse("Collector access required", [], 403);
  }
  return null;
}

export async function GET() {
  try {
    // Recipient is strictly the authenticated session user. A collector can
    // only ever receive their own notifications.
    const sessionUser = await requireRole("collector");

    await connectDB();

    const recipient = new mongoose.Types.ObjectId(sessionUser.id);

    const [items, unreadCount] = await Promise.all([
      Notification.find({ recipient })
        .sort({ createdAt: -1 })
        .limit(50)
        .select("title message isRead createdAt metadata")
        .lean(),
      Notification.countDocuments({ recipient, isRead: false }),
    ]);

    return successResponse("Notifications retrieved successfully", {
      items: items.map((n) => ({
        id: n._id.toString(),
        title: n.title,
        message: n.message,
        read: n.isRead,
        time: n.createdAt,
        type: n.type,
        pickupId:
          typeof n.metadata?.pickupId === "string"
            ? n.metadata.pickupId
            : undefined,
      })),
      unreadCount,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to retrieve notifications";

    return authError(message) || errorResponse(message, [], 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionUser = await requireRole("collector");

    const body = await request.json();
    const id = typeof body?.id === "string" ? body.id : "";

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid notification id", [], 400);
    }

    await connectDB();

    // Scoped by recipient so one collector can never mark another's as read.
    const updated = await Notification.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        recipient: new mongoose.Types.ObjectId(sessionUser.id),
      },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    )
      .select("title message isRead createdAt")
      .lean();

    if (!updated) {
      return errorResponse("Notification not found", [], 404);
    }

    return successResponse("Notification marked as read", {
      notification: {
        id: updated._id.toString(),
        title: updated.title,
        message: updated.message,
        read: updated.isRead,
        time: updated.createdAt,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update notification";

    return authError(message) || errorResponse(message, [], 500);
  }
}
