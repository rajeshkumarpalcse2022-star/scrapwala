import mongoose, { Schema, Document } from "mongoose";

export type UserRole = "user" | "collector" | "admin";

export interface IUser extends Document {
  name: string;
  email?: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  password?: string;
  isActive: boolean;
  isVerified: boolean;
  collectorId?: string;
  mustChangePassword: boolean;
  firstLoginOtpVerifiedAt?: Date;
  lastLoginAt?: Date;
  failedLoginAttempts?: number;
  lockedUntil?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, sparse: true },
    phone: { type: String, required: true, unique: true, trim: true },
    role: {
      type: String,
      enum: ["user", "collector", "admin"],
      default: "user",
    },
    avatar: { type: String },
    password: { type: String, select: false },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    collectorId: { type: String, unique: true, sparse: true },
    mustChangePassword: { type: Boolean, default: false },
    firstLoginOtpVerifiedAt: { type: Date },
    lastLoginAt: { type: Date },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { sparse: true });
UserSchema.index({ role: 1 });
UserSchema.index({ collectorId: 1 }, { sparse: true });

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
