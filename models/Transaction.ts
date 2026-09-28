import mongoose, { Schema, Document } from "mongoose";

export interface ITransaction extends Document {
  transactionId: string;
  pickup: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  collector?: mongoose.Types.ObjectId;
  type: "pickup_payment" | "refund" | "adjustment";
  amount: number;
  paymentMethod?: "cash" | "upi" | "bank_transfer";
  status: "pending" | "paid" | "failed" | "refunded";
  reference?: string;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
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
    collector: { type: Schema.Types.ObjectId, ref: "User" },
    type: {
      type: String,
      enum: ["pickup_payment", "refund", "adjustment"],
      required: true,
    },
    amount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "bank_transfer"],
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    reference: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Transaction ||
  mongoose.model<ITransaction>("Transaction", TransactionSchema);
