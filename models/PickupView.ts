import mongoose, { Schema, Document } from "mongoose";

export type PickupViewRole = "admin" | "collector";

export interface IPickupView extends Document {
  pickup: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  role: PickupViewRole;
  seenAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PickupViewSchema = new Schema<IPickupView>(
  {
    pickup: {
      type: Schema.Types.ObjectId,
      ref: "Pickup",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "collector"],
      required: true,
    },
    seenAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

PickupViewSchema.index({ pickup: 1, user: 1, role: 1 }, { unique: true });
PickupViewSchema.index({ user: 1, role: 1, seenAt: 1 });

export default mongoose.models.PickupView ||
  mongoose.model<IPickupView>("PickupView", PickupViewSchema);
