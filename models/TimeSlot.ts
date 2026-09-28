import mongoose, { Schema, Document } from "mongoose";

export interface ITimeSlot extends Document {
  label: string;
  startTime: string;
  endTime: string;
  capacity: number;
  isActive: boolean;
  sortOrder: number;
}

const TimeSlotSchema = new Schema<ITimeSlot>(
  {
    label: { type: String, required: true, trim: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    capacity: { type: Number, required: true, default: 20 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

TimeSlotSchema.index({ isActive: 1 });

export default mongoose.models.TimeSlot ||
  mongoose.model<ITimeSlot>("TimeSlot", TimeSlotSchema);
