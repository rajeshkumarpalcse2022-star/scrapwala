import mongoose, { Schema, Document } from "mongoose"

export type OtpPurpose = "signup" | "collector_first_login"

export interface IOtpVerification extends Document {
  identifier: string
  purpose: OtpPurpose
  codeHash: string
  expiresAt: Date
  attempts: number
  maxAttempts: number
  verifiedAt?: Date
  userId?: mongoose.Types.ObjectId
  createdAt: Date
}

const OtpVerificationSchema = new Schema<IOtpVerification>(
  {
    identifier: {
      type: String,
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      required: true,
      enum: ["signup", "collector_first_login"],
    },
    codeHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    verifiedAt: {
      type: Date,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
)

OtpVerificationSchema.index({ identifier: 1, purpose: 1, createdAt: -1 })

export default mongoose.models.OtpVerification ||
  mongoose.model<IOtpVerification>("OtpVerification", OtpVerificationSchema)
