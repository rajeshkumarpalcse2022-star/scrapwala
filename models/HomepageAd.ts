import mongoose, { Schema, Document } from "mongoose";

export interface HomepageAdImage {
  url: string;
  publicId?: string;
  alt: string;
}

export interface IHomepageAd extends Document {
  title: string;
  image: HomepageAdImage;
  linkUrl?: string | null;
  isActive: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
  createdBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const HomepageAdImageSchema = new Schema<HomepageAdImage>(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    alt: { type: String, default: "" },
  },
  { _id: false }
);

const HomepageAdSchema = new Schema<IHomepageAd>(
  {
    title: { type: String, required: true, trim: true },
    image: { type: HomepageAdImageSchema, required: true },
    linkUrl: { type: String, trim: true, default: null },
    isActive: { type: Boolean, default: false, index: true },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true, strict: true }
);

/* Public lookup: active ads by recency. */
HomepageAdSchema.index({ isActive: 1, updatedAt: -1 });

export default mongoose.models.HomepageAd ||
  mongoose.model<IHomepageAd>("HomepageAd", HomepageAdSchema);
