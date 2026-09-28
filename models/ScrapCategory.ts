import mongoose, { Schema, Document } from "mongoose";

export interface IScrapCategory extends Document {
  name: string;
  slug: string;
  description: string;
  parent?: mongoose.Types.ObjectId | null;
  image?: string;
  imageUrl?: string;
  cloudinaryPublicId?: string;
  isActive: boolean;
  sortOrder: number;
}

const ScrapCategorySchema = new Schema<IScrapCategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "" },
    parent: {
      type: Schema.Types.ObjectId,
      ref: "ScrapCategory",
      default: null,
    },
    image: { type: String },
    imageUrl: { type: String },
    cloudinaryPublicId: { type: String },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ScrapCategorySchema.index({ slug: 1 });
ScrapCategorySchema.index({ isActive: 1 });
ScrapCategorySchema.index({ parent: 1 });

export default mongoose.models.ScrapCategory ||
  mongoose.model<IScrapCategory>("ScrapCategory", ScrapCategorySchema);
