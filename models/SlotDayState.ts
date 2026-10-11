import mongoose, { Schema, Document } from "mongoose";

/**
 * Atomic per-slot, per-day reservation counter used to enforce capacity.
 *
 * Availability is *displayed* from the real Pickup count, but booking uses
 * this counter so capacity checks and increments are a single atomic
 * conditional update (no check-then-insert race):
 *
 *   findOneAndUpdate({ timeSlot, date, booked: { $lt: capacity } },
 *                    { $inc: { booked: 1 } })
 *
 * `date` is the IST calendar day key ("YYYY-MM-DD"). The counter self-heals
 * upward against the real booking count whenever a reservation is attempted,
 * so a stale/low counter can never allow overbooking.
 */
export interface ISlotDayState extends Document {
  timeSlot: mongoose.Types.ObjectId;
  date: string;
  booked: number;
  createdAt: Date;
  updatedAt: Date;
}

const SlotDayStateSchema = new Schema<ISlotDayState>(
  {
    timeSlot: {
      type: Schema.Types.ObjectId,
      ref: "TimeSlot",
      required: true,
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    booked: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true }
);

SlotDayStateSchema.index({ timeSlot: 1, date: 1 }, { unique: true });

export default mongoose.models.SlotDayState ||
  mongoose.model<ISlotDayState>("SlotDayState", SlotDayStateSchema);
