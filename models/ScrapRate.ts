import mongoose, { Schema, Document } from "mongoose";

export interface IScrapRate extends Document {
  category: mongoose.Types.ObjectId;
  itemName: string;
  slug: string;
  minRate: number;
  maxRate: number;
  unit: "kg" | "piece" | "unit";
  isActive: boolean;
  effectiveFrom?: Date;
  effectiveTo?: Date;
}

const ScrapRateSchema = new Schema<IScrapRate>(
  {
    category: {
      type: Schema.Types.ObjectId,
      ref: "ScrapCategory",
      required: true,
      index: true,
    },
    itemName: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    minRate: { type: Number, required: true },
    maxRate: { type: Number, required: true },
    unit: {
      type: String,
      enum: ["kg", "piece", "unit"],
      default: "kg",
    },
    isActive: { type: Boolean, default: true },
    effectiveFrom: { type: Date },
    effectiveTo: { type: Date },
  },
  { timestamps: true }
);

ScrapRateSchema.index({ slug: 1 });
ScrapRateSchema.index({ isActive: 1 });

export default mongoose.models.ScrapRate ||
  mongoose.model<IScrapRate>("ScrapRate", ScrapRateSchema);
