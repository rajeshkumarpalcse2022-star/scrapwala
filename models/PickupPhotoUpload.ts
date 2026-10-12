import mongoose, { Schema, Document } from "mongoose";

/**
 * Staging record for a customer scrap photo uploaded before the pickup
 * booking exists. The booking API only attaches photos whose publicId is
 * staged under the same authenticated customer — client-supplied URLs are
 * never trusted. Unattached records auto-expire via the `purgeAt` TTL index
 * so abandoned uploads do not accumulate.
 */
export interface IPickupPhotoUpload extends Document {
  customer: mongoose.Types.ObjectId;
  url: string;
  publicId: string;
  uploadSessionId?: string;
  pickup?: mongoose.Types.ObjectId;
  purgeAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PickupPhotoUploadSchema = new Schema<IPickupPhotoUpload>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    // Client-generated id for one booking form session. The per-pickup
    // photo cap is counted per session so abandoned uploads from earlier
    // attempts can never block a fresh booking.
    uploadSessionId: { type: String, index: true },
    pickup: { type: Schema.Types.ObjectId, ref: "Pickup" },
    purgeAt: { type: Date },
  },
  { timestamps: true }
);

/** Deletes unattached staging rows once purgeAt passes. */
PickupPhotoUploadSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.PickupPhotoUpload ||
  mongoose.model<IPickupPhotoUpload>(
    "PickupPhotoUpload",
    PickupPhotoUploadSchema
  );
