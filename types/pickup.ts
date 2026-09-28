export interface ScrapSubcategoryOption {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
}

export interface ScrapCatalogGroup {
  id: string;
  name: string;
  description: string;
  subcategories: ScrapSubcategoryOption[];
}

export interface PickupAddress {
  fullName: string;
  phone: string;
  houseFlatBuilding: string;
  streetArea: string;
  landmark: string;
  city: string;
  state: string;
  pinCode: string;
  addressType: "home" | "office" | "other";
  /** Map-confirmed pickup coordinates (required before booking). */
  latitude?: number | null;
  longitude?: number | null;
}

export interface TimeSlot {
  id: string;
  label?: string;
  startTime: string;
  endTime: string;
  capacity?: number;
  booked?: number;
  availability: "available" | "limited" | "unavailable";
}

export interface PickupDate {
  date: Date;
  label: string;
}

export interface ScrapRate {
  subcategoryId: string;
  name: string;
  minRate: number;
  maxRate: number;
  unit: "kg" | "piece" | "unit";
}

export type VehicleId = "small" | "large";

export interface SelectedVehicle {
  id: VehicleId;
  name: string;
  label: string;
}

export interface PickupState {
  vehicle: SelectedVehicle | null;
  selectedScrap: string[];
  address: PickupAddress | null;
  expectedWeight: string | null;
  pickupDate: PickupDate | null;
  timeSlot: TimeSlot | null;
  currentStep: number;
}

export type PickupStep =
  | "vehicle"
  | "location"
  | "scrap"
  | "weight"
  | "rate"
  | "date"
  | "time";

export const PICKUP_STEPS: { key: PickupStep; label: string; number: number }[] = [
  { key: "vehicle", label: "Vehicle", number: 1 },
  { key: "location", label: "Location", number: 2 },
  { key: "scrap", label: "Scrap", number: 3 },
  { key: "weight", label: "Weight", number: 4 },
  { key: "rate", label: "Rate", number: 5 },
  { key: "date", label: "Date", number: 6 },
  { key: "time", label: "Time", number: 7 },
];

/** Screens after step 7 (not numbered in the stepper). */
export const REVIEW_STEP = 8;
export const SUCCESS_STEP = 9;
