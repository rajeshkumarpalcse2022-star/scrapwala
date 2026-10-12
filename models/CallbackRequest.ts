import mongoose, { Schema, type Model } from "mongoose";
import type {
  CallbackReason,
  CallbackStatus,
} from "@/lib/validations/callback";
import {
  CALLBACK_REASONS,
  CALLBACK_STATUSES,
} from "@/lib/validations/callback";

export interface ICallbackRequest extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  requestId: string;
  name: string;
  phone: string;
  reasonType: CallbackReason;
  customReason?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  status: CallbackStatus;
  seenAt: Date | null;
  user?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const CallbackRequestSchema = new Schema<ICallbackRequest>(
  {
    requestId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    reasonType: {
      type: String,
      enum: CALLBACK_REASONS,
      required: true,
    },
    customReason: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String, trim: true },
    status: {
      type: String,
      enum: CALLBACK_STATUSES,
      default: "new",
      index: true,
    },
    seenAt: { type: Date, default: null, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

CallbackRequestSchema.index({ createdAt: -1 });

export default (mongoose.models.CallbackRequest as Model<ICallbackRequest>) ||
  mongoose.model<ICallbackRequest>("CallbackRequest", CallbackRequestSchema);
