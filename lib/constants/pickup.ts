/**
 * Serviceable PIN codes are resolved from the MongoDB Location collection
 * via GET /api/serviceability — there is intentionally no hardcoded PIN list.
 *
 * Scrap categories/subcategories are loaded from MongoDB via
 * GET /api/categories (see app/(public)/pickup/page.tsx).
 *
 * Time slots are admin-configured in MongoDB and loaded via
 * GET /api/time-slots (see components/pickup/TimeSlotSelection.tsx).
 */

/**
 * Vehicle options for pickup scheduling (spec §5).
 * Vehicle type is required for every booking.
 */
export const VEHICLE_OPTIONS = [
  { id: "small", name: "Small", label: "Our Rider" },
  { id: "large", name: "Large", label: "Our Mini Truck" },
] as const;

export type VehicleId = (typeof VEHICLE_OPTIONS)[number]["id"];

/**
 * Expected weight range options (spec §2).
 * Stored on the pickup as display text; exact weight is
 * determined later during weighing.
 */
export const WEIGHT_RANGES = [
  { id: "0-10", label: "0–10 Kg" },
  { id: "10-20", label: "10–20 Kg" },
  { id: "20-30", label: "20–30 Kg" },
  { id: "30-50", label: "30–50 Kg" },
  { id: "50-200", label: "50–200 Kg" },
  { id: "200+", label: "200+ Kg" },
] as const;

export type WeightRangeId = (typeof WEIGHT_RANGES)[number]["id"];

/**
 * MOCK DATA — Indian states for the address form.
 */
export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Chandigarh",
  "Puducherry",
  "Andaman and Nicobar Islands",
  "Dadra and Nagar Haveli",
  "Daman and Diu",
  "Lakshadweep",
];

/**
 * Phase 2 — Customer pickup tracking & history.
 * Real backend statuses only (models/Pickup.ts) — no frontend-only statuses.
 */

/** Ordered tracking stages shown to the customer (spec 2). */
export const TIMELINE_STAGES = [
  "Requested",
  "Scheduled",
  "Assigned",
  "Accepted",
  "On the Way",
  "Arrived",
  "Weighing",
  "Payment",
  "Completed",
] as const;

/** Customer-friendly label per real Pickup.status value. */
export const PICKUP_STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  assigned: "Assigned",
  accepted: "Accepted",
  on_the_way: "On the Way",
  arrived: "Arrived",
  weighing: "Weighing",
  payment_pending: "Payment",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_REACHED: Record<string, number> = {
  scheduled: 1,
  assigned: 2,
  accepted: 3,
  on_the_way: 4,
  arrived: 5,
  weighing: 6,
  payment_pending: 7,
  completed: 8,
};

/** Index in TIMELINE_STAGES reached by the given real status. */
export function reachedIndexFor(status: string): number {
  return STATUS_REACHED[status] ?? 0;
}

export function isActiveStatus(status: string): boolean {
  return status !== "completed" && status !== "cancelled";
}

export function isCompletedStatus(status: string): boolean {
  return status === "completed";
}

export function isCancelledStatus(status: string): boolean {
  return status === "cancelled";
}
