import mongoose, { Schema, Document } from "mongoose";

export type HiringFormStatus = "draft" | "published" | "closed";

export interface IHiringFieldOption {
  label: string;
  value: string;
}

export interface IHiringField {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: IHiringFieldOption[];
  min?: number;
  max?: number;
  maxLength?: number;
}

/**
 * A hiring application form created by an admin. The `fields` array is the
 * authoritative configuration that drives the public form renderer and the
 * submission validator — nothing about the public form is hardcoded.
 */
export interface IHiringForm extends Document {
  title: string;
  slug: string;
  subtitle?: string;
  description: string;
  instructions?: string;
  fields: IHiringField[];
  status: HiringFormStatus;
  isFeatured: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const HiringFieldOptionSchema = new Schema<IHiringFieldOption>(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const HiringFieldSchema = new Schema<IHiringField>(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, required: true },
    placeholder: { type: String, trim: true },
    helpText: { type: String, trim: true },
    required: { type: Boolean, default: false },
    options: { type: [HiringFieldOptionSchema], default: undefined },
    min: { type: Number },
    max: { type: Number },
    maxLength: { type: Number },
  },
  { _id: false }
);

const HiringFormSchema = new Schema<IHiringForm>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    subtitle: { type: String, trim: true },
    description: { type: String, required: true },
    instructions: { type: String },
    fields: { type: [HiringFieldSchema], required: true },
    status: {
      type: String,
      enum: ["draft", "published", "closed"],
      default: "draft",
      index: true,
    },
    isFeatured: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

HiringFormSchema.index({ status: 1, updatedAt: -1 });

export default mongoose.models.HiringForm ||
  mongoose.model<IHiringForm>("HiringForm", HiringFormSchema);
