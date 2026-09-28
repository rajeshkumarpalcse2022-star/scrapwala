import mongoose from "mongoose";
import Notification, { INotification } from "@/models/Notification";
import connectDB from "@/lib/db/mongoose";
import { ApiError } from "@/lib/utils/api-error";

export interface CreateNotificationInput {
  recipient: string;
  type: INotification["type"];
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<INotification> {
  if (!mongoose.Types.ObjectId.isValid(input.recipient)) {
    throw new ApiError(400, "Invalid notification recipient", "INVALID_RECIPIENT");
  }

  await connectDB();

  return Notification.create({
    recipient: new mongoose.Types.ObjectId(input.recipient),
    type: input.type,
    title: input.title,
    message: input.message,
    isRead: false,
    metadata: input.metadata,
  });
}

const notificationService = { createNotification };
export default notificationService;
