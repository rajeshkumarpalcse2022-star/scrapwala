import mongoose, { Schema, Document } from "mongoose";

/**
 * Singleton careers-page notice image managed from Hiring Management.
 *
 * Only an image is stored: there is no title, body or link so the public
 * notice card stays a simple visual announcement.
 */
export interface IHiringNotice extends Document {
  key: string;
  imageUrl: string;
  publicId?: string;
  updatedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const HiringNoticeSchema = new Schema<IHiringNotice>(
  {
    key: { type: String, required: true, unique: true, default: "careers" },
    imageUrl: { type: String, required: true },
    publicId: { type: String, trim: true },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true, strict: true }
);

export default mongoose.models.HiringNotice ||
  mongoose.model<IHiringNotice>("HiringNotice", HiringNoticeSchema);
