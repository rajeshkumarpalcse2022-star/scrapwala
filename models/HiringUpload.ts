import mongoose, { Schema, Document } from "mongoose";

/**
 * Staging record for a hiring document (photo / signature / resume) uploaded
 * before the application exists. The submission API only attaches uploads
 * owned by the same authenticated user — client-supplied URLs are never
 * trusted. Unattached records expire via the `purgeAt` TTL index.
 */
export interface IHiringUpload extends Document {
  user: mongoose.Types.ObjectId;
  /** photo | signature | document — the role the file will play. */
  kind: string;
  fileName: string;
  mimeType: string;
  size: number;
  cloudinaryPublicId: string;
  cloudinaryUrl: string;
  width?: number;
  height?: number;
  application?: mongoose.Types.ObjectId | null;
  purgeAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HiringUploadSchema = new Schema<IHiringUpload>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: ["photo", "signature", "document"],
      required: true,
    },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    cloudinaryPublicId: { type: String, required: true },
    cloudinaryUrl: { type: String, required: true },
    width: { type: Number },
    height: { type: Number },
    application: { type: Schema.Types.ObjectId, ref: "HiringApplication" },
    purgeAt: { type: Date },
  },
  { timestamps: true }
);

/** Deletes unattached staging rows once purgeAt passes. */
HiringUploadSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });
HiringUploadSchema.index({ user: 1, application: 1 });

export default mongoose.models.HiringUpload ||
  mongoose.model<IHiringUpload>("HiringUpload", HiringUploadSchema);
