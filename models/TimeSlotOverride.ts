import mongoose, { Schema, Document } from "mongoose";

/**
 * Date-specific capacity override for a regular time slot (spec §Section B).
 *
 * `date` is the IST calendar day key ("YYYY-MM-DD") of the overridden day.
 * A slot can have at most one override per date — enforced by the unique
 * compound index below, so concurrent upserts cannot create duplicates.
 */
export interface ITimeSlotOverride extends Document {
  timeSlot: mongoose.Types.ObjectId;
  date: string;
  capacity: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TimeSlotOverrideSchema = new Schema<ITimeSlotOverride>(
  {
    timeSlot: {
      type: Schema.Types.ObjectId,
      ref: "TimeSlot",
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    capacity: { type: Number, required: true, min: 1 },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

TimeSlotOverrideSchema.index({ timeSlot: 1, date: 1 }, { unique: true });
TimeSlotOverrideSchema.index({ date: 1 });

export default mongoose.models.TimeSlotOverride ||
  mongoose.model<ITimeSlotOverride>(
    "TimeSlotOverride",
    TimeSlotOverrideSchema
  );
