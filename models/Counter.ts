import mongoose, { Schema, Document } from "mongoose";

export interface ICounter extends Document {
  key: string;
  sequence: number;
}

const CounterSchema = new Schema<ICounter>({
  key: { type: String, required: true, unique: true },
  sequence: { type: Number, default: 0 },
});

export default mongoose.models.Counter ||
  mongoose.model<ICounter>("Counter", CounterSchema);
