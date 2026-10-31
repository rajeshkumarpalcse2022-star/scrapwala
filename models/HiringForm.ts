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
 *
 * `price` is the application fee in rupees set by an admin. A fee of 0 (the
 * default) keeps the form free; a fee above 0 makes every applicant pay
 * through Razorpay before their application can be created.
 */
export interface IHiringForm extends Document {
  title: string;
  slug: string;
  subtitle?: string;
  description: string;
  instructions?: string;
  fields: IHiringField[];
  price: number;
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
    price: { type: Number, default: 0, min: 0 },
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

/**
 * HMR-safe model registration.
 *
 * Next.js dev hot-reloads this module, but Mongoose caches models for the
 * lifetime of the process. With the plain `mongoose.models.X || model()`
 * pattern, a reload keeps returning a model built from an OLD schema — and
 * Mongoose strict mode then silently drops any field added to the schema
 * (this is what made `price` reset to 0 on every save). If a reload produces
 * a different schema object, the stale model is evicted and re-registered.
 */
type HiringFormModel = mongoose.Model<IHiringForm>;

function registerHiringFormModel(): HiringFormModel {
  const cached = mongoose.models.HiringForm as HiringFormModel | undefined;
  if (cached) {
    if ((cached.schema as unknown) === (HiringFormSchema as unknown)) {
      return cached;
    }
    mongoose.deleteModel("HiringForm");
  }
  return mongoose.model<IHiringForm>("HiringForm", HiringFormSchema);
}

export default registerHiringFormModel();
