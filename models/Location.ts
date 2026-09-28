import mongoose, { Schema, Document } from "mongoose";

export interface ILocation extends Document {
  name: string;
  city: string;
  state: string;
  postalCodes: string[];
  isActive: boolean;
  serviceRadius?: number;
  latitude?: number;
  longitude?: number;
}

const LocationSchema = new Schema<ILocation>(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true, index: true },
    state: { type: String, required: true, trim: true },
    postalCodes: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    serviceRadius: { type: Number },
    latitude: { type: Number },
    longitude: { type: Number },
  },
  { timestamps: true }
);

LocationSchema.index({ isActive: 1 });

export default mongoose.models.Location ||
  mongoose.model<ILocation>("Location", LocationSchema);
