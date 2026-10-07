import mongoose, { Schema, Document } from "mongoose";

export interface IPickupItem {
  category: mongoose.Types.ObjectId;
  categoryName: string;
  rate: number;
  unit: string;
  estimatedWeight: number;
  actualWeight?: number;
  amount: number;
}

export interface IPickupAddress {
  fullName: string;
  phone: string;
  houseFlatBuilding: string;
  streetArea: string;
  landmark?: string;
  city: string;
  state: string;
  pinCode: string;
  addressType?: "home" | "office" | "other";
  latitude?: number;
  longitude?: number;
}

export interface IPickupTimeSlot {
  startTime: string;
  endTime: string;
}

export interface IPickup extends Document {
  pickupId: string;
  customer: mongoose.Types.ObjectId;
  collector?: mongoose.Types.ObjectId;
  vehicle?: "small" | "large";
  address: IPickupAddress;
  location?: mongoose.Types.ObjectId;
  scheduledDate: Date;
  timeSlot: IPickupTimeSlot;
  status:
    | "scheduled"
    | "assigned"
    | "accepted"
    | "on_the_way"
    | "arrived"
    | "weighing"
    | "payment_pending"
    | "completed"
    | "cancelled";
  items: IPickupItem[];
  expectedWeight?: string;
  estimatedAmount: number;
  actualAmount: number;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  paymentMethod?: "cash" | "upi" | "bank_transfer";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PickupItemSchema = new Schema<IPickupItem>(
  {
    category: {
      type: Schema.Types.ObjectId,
      ref: "ScrapCategory",
      required: true,
    },
    categoryName: { type: String, required: true },
    rate: { type: Number, required: true },
    unit: { type: String, required: true },
    estimatedWeight: { type: Number, required: true },
    actualWeight: { type: Number },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const PickupAddressSchema = new Schema<IPickupAddress>(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    houseFlatBuilding: { type: String, required: true },
    streetArea: { type: String, required: true },
    landmark: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pinCode: { type: String, required: true },
    addressType: { type: String, enum: ["home", "office", "other"] },
    latitude: { type: Number },
    longitude: { type: Number },
  },
  { _id: false }
);

const PickupTimeSlotSchema = new Schema<IPickupTimeSlot>(
  {
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  { _id: false }
);

const PickupSchema = new Schema<IPickup>(
  {
    pickupId: { type: String, required: true, unique: true, index: true },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    collector: { type: Schema.Types.ObjectId, ref: "User", index: true },
    vehicle: { type: String, enum: ["small", "large"] },
    address: { type: PickupAddressSchema, required: true },
    location: { type: Schema.Types.ObjectId, ref: "Location" },
    scheduledDate: { type: Date, required: true },
    timeSlot: { type: PickupTimeSlotSchema, required: true },
    status: {
      type: String,
      enum: [
        "scheduled",
        "assigned",
        "accepted",
        "on_the_way",
        "arrived",
        "weighing",
        "payment_pending",
        "completed",
        "cancelled",
      ],
      default: "scheduled",
      index: true,
    },
    items: { type: [PickupItemSchema], default: [] },
    expectedWeight: { type: String },
    estimatedAmount: { type: Number, default: 0 },
    actualAmount: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "bank_transfer"],
    },
    notes: { type: String },
  },
  { timestamps: true }
);

PickupSchema.index({ scheduledDate: 1 });

export default mongoose.models.Pickup ||
  mongoose.model<IPickup>("Pickup", PickupSchema);
