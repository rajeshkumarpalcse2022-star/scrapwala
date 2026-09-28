import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  type:
    | "pickup_created"
    | "pickup_assigned"
    | "pickup_completed"
    | "payment_received"
    | "system";
  title: string;
  message: string;
  isRead: boolean;
  readAt?: Date;
  metadata?: Record<string, unknown>;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "pickup_created",
        "pickup_assigned",
        "pickup_completed",
        "payment_received",
        "system",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
