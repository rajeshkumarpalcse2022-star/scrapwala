import mongoose, { Schema, Document } from "mongoose";

export type HiringPaymentStatus = "created" | "paid" | "failed";

/**
 * A Razorpay order created for a paid hiring form.
 *
 * The record is written when the order is created (status "created") and is
 * confirmed with the payment id + verified signature when the applicant
 * submits — the application row is linked to the payment so admins can always
 * answer "did this applicant pay?" and Razorpay dashboards can be reconciled
 * through the `orderId` / `paymentId`.
 */
export interface IHiringPayment extends Document {
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  form: mongoose.Types.ObjectId;
  /** Snapshot of the form at payment time — the fee actually charged. */
  formTitle: string;
  formSlug: string;
  user: mongoose.Types.ObjectId;
  /** Amount in paise, exactly as sent to Razorpay. */
  amount: number;
  currency: string;
  status: HiringPaymentStatus;
  application?: mongoose.Types.ObjectId;
  failureReason?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HiringPaymentSchema = new Schema<IHiringPayment>(
  {
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    razorpayPaymentId: { type: String, trim: true },
    razorpaySignature: { type: String, trim: true },
    form: {
      type: Schema.Types.ObjectId,
      ref: "HiringForm",
      required: true,
      index: true,
    },
    formTitle: { type: String, required: true },
    formSlug: { type: String, required: true },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true, default: "INR" },
    status: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
      index: true,
    },
    application: {
      type: Schema.Types.ObjectId,
      ref: "HiringApplication",
    },
    failureReason: { type: String, trim: true },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

/** One paid order may back at most one application. */
HiringPaymentSchema.index({ application: 1 }, { unique: true, sparse: true });

/**
 * HMR-safe model registration (same reason as HiringForm): Next.js hot
 * reloads re-evaluate this module, but Mongoose would otherwise keep serving
 * a model built from an old schema, silently dropping new fields.
 */
type HiringPaymentModel = mongoose.Model<IHiringPayment>;

function registerHiringPaymentModel(): HiringPaymentModel {
  const cached = mongoose.models.HiringPayment as HiringPaymentModel | undefined;
  if (cached) {
    if ((cached.schema as unknown) === (HiringPaymentSchema as unknown)) {
      return cached;
    }
    mongoose.deleteModel("HiringPayment");
  }
  return mongoose.model<IHiringPayment>("HiringPayment", HiringPaymentSchema);
}

export default registerHiringPaymentModel();
