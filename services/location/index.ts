import mongoose from "mongoose";
import Location from "@/models/Location";
import connectDB from "@/lib/db/mongoose";
import { ApiError } from "@/lib/utils/api-error";
import type {
  CreateLocationInput,
  UpdateLocationInput,
} from "@/lib/validations/location";

export interface LocationDTO {
  id: string;
  name: string;
  city: string;
  state: string;
  postalCodes: string[];
  isActive: boolean;
  serviceRadius?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

function serialize(doc: {
  _id: mongoose.Types.ObjectId;
  name: string;
  city: string;
  state: string;
  postalCodes: string[];
  isActive: boolean;
  serviceRadius?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}): LocationDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    city: doc.city,
    state: doc.state,
    postalCodes: doc.postalCodes,
    isActive: doc.isActive,
    serviceRadius: doc.serviceRadius,
    latitude: doc.latitude ?? null,
    longitude: doc.longitude ?? null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
  };
}

/** Canonical PIN representation: trimmed, non-empty, deduplicated strings. */
export function normalizePostalCodes(pins: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const raw of pins) {
    const pin = String(raw).trim();
    if (!pin || seen.has(pin)) continue;
    seen.add(pin);
    normalized.push(pin);
  }

  return normalized;
}

export function normalizePin(pinCode: string): string {
  return String(pinCode ?? "").trim();
}

export function isValidPin(pinCode: string): boolean {
  return /^\d{6}$/.test(normalizePin(pinCode));
}

export async function listLocations(): Promise<LocationDTO[]> {
  await connectDB();

  const locations = await Location.find({})
    .sort({ createdAt: -1 })
    .lean();

  return locations.map(serialize);
}

export async function createLocation(
  input: CreateLocationInput
): Promise<LocationDTO> {
  await connectDB();

  const postalCodes = normalizePostalCodes(input.postalCodes);

  if (postalCodes.length === 0) {
    throw new ApiError(400, "At least one PIN code is required", "INVALID_PIN");
  }

  const location = await Location.create({
    name: input.name.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    postalCodes,
    isActive: input.isActive ?? true,
    serviceRadius: input.serviceRadius ?? undefined,
    latitude: input.latitude ?? undefined,
    longitude: input.longitude ?? undefined,
  });

  return serialize(location.toObject());
}

export async function updateLocation(
  id: string,
  input: UpdateLocationInput
): Promise<LocationDTO> {
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, "Location not found", "NOT_FOUND");
  }

  const updates: Record<string, unknown> = {};
  const unset: Record<string, 1> = {};

  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.city !== undefined) updates.city = input.city.trim();
  if (input.state !== undefined) updates.state = input.state.trim();
  if (input.isActive !== undefined) updates.isActive = input.isActive;
  if (input.serviceRadius !== undefined) {
    if (input.serviceRadius === null) unset.serviceRadius = 1;
    else updates.serviceRadius = input.serviceRadius;
  }
  if (input.latitude !== undefined) {
    if (input.latitude === null) unset.latitude = 1;
    else updates.latitude = input.latitude;
  }
  if (input.longitude !== undefined) {
    if (input.longitude === null) unset.longitude = 1;
    else updates.longitude = input.longitude;
  }
  if (input.postalCodes !== undefined) {
    const postalCodes = normalizePostalCodes(input.postalCodes);
    if (postalCodes.length === 0) {
      throw new ApiError(400, "At least one PIN code is required", "INVALID_PIN");
    }
    updates.postalCodes = postalCodes;
  }

  const update: Record<string, unknown> = {};
  if (Object.keys(updates).length > 0) update.$set = updates;
  if (Object.keys(unset).length > 0) update.$unset = unset;
  if (Object.keys(update).length === 0) {
    const current = await Location.findById(id).lean();
    if (!current) {
      throw new ApiError(404, "Location not found", "NOT_FOUND");
    }
    return serialize(current);
  }

  const location = await Location.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  }).lean();

  if (!location) {
    throw new ApiError(404, "Location not found", "NOT_FOUND");
  }

  return serialize(location);
}

export interface ServiceabilityResult {
  serviceable: boolean;
  location?: { id: string; name: string; city: string };
}

export interface CoordServiceabilityResult extends ServiceabilityResult {
  method?: "coordinates" | "pin";
}

/**
 * Single source of truth check: an active Location document whose postalCodes
 * contain the normalized PIN.
 */
export async function checkServiceability(
  pinCode: string
): Promise<ServiceabilityResult> {
  await connectDB();

  const pin = normalizePin(pinCode);

  if (!isValidPin(pin)) {
    throw new ApiError(400, "Please enter a valid 6-digit PIN code", "INVALID_PIN");
  }

  const location = await Location.findOne({ isActive: true, postalCodes: pin })
    .select("name city")
    .lean();

  if (!location) {
    return { serviceable: false };
  }

  return {
    serviceable: true,
    location: {
      id: location._id.toString(),
      name: location.name,
      city: location.city,
    },
  };
}

/** Default radius (km) applied when a location has a center but no serviceRadius. */
export const DEFAULT_SERVICE_RADIUS_KM = 15;

export function isValidLatitude(latitude: number): boolean {
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90;
}

export function isValidLongitude(longitude: number): boolean {
  return Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

/** Great-circle distance in kilometers. */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Coordinate-authoritative serviceability check (spec §7/§17).
 *
 * Every ACTIVE location is checked with its own method:
 *   - location has center coordinates  → point-in-radius (serviceRadius, km)
 *     (center is authoritative for that location; PIN is NOT consulted)
 *   - location has no center          → existing PIN-in-postalCodes check
 * Serviceable when ANY active location passes its check.
 */
export async function checkServiceabilityByLocation(
  latitude: number,
  longitude: number,
  pinCode?: string
): Promise<CoordServiceabilityResult> {
  await connectDB();

  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    throw new ApiError(400, "Invalid coordinates", "INVALID_COORDINATES");
  }

  const active = await Location.find({ isActive: true })
    .select("name city postalCodes serviceRadius latitude longitude")
    .lean();

  if (active.length === 0) {
    return { serviceable: false };
  }

  for (const loc of active) {
    if (
      typeof loc.latitude === "number" &&
      typeof loc.longitude === "number"
    ) {
      const radius =
        typeof loc.serviceRadius === "number" && loc.serviceRadius > 0
          ? loc.serviceRadius
          : DEFAULT_SERVICE_RADIUS_KM;
      const distance = haversineKm(latitude, longitude, loc.latitude, loc.longitude);
      if (distance <= radius) {
        return {
          serviceable: true,
          location: {
            id: loc._id.toString(),
            name: loc.name,
            city: loc.city,
          },
          method: "coordinates",
        };
      }
    }
  }

  const pin = normalizePin(pinCode ?? "");
  if (isValidPin(pin)) {
    const match = active.find(
      (loc) =>
        typeof loc.latitude !== "number" &&
        typeof loc.longitude !== "number" &&
        loc.postalCodes.includes(pin)
    );
    if (match) {
      return {
        serviceable: true,
        location: {
          id: match._id.toString(),
          name: match.name,
          city: match.city,
        },
        method: "pin",
      };
    }
  }

  return { serviceable: false };
}

const locationService = {
  listLocations,
  createLocation,
  updateLocation,
  checkServiceability,
  checkServiceabilityByLocation,
  normalizePostalCodes,
  normalizePin,
  isValidPin,
};

export default locationService;
