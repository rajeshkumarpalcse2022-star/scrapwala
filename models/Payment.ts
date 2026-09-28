import mongoose, { Schema, Document } from "mongoose";

export interface IPayment extends Document {
  paymentId: string;
  pickup: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  amount: number;
  method: "cash" | "upi" | "bank_transfer";
  status: "pending" | "paid" | "failed" | "refunded";
  paidAt?: Date;
  reference?: string;
  notes?: string;
}

const PaymentSchema = new Schema<IPayment>(
  {
    paymentId: { type: String, required: true, unique: true, index: true },
    pickup: {
      type: Schema.Types.ObjectId,
      ref: "Pickup",
      required: true,
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: ["cash", "upi", "bank_transfer"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    paidAt: { type: Date },
    reference: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Payment ||
  mongoose.model<IPayment>("Payment", PaymentSchema);
