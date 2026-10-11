/**
 * Pure capacity/availability helpers for time slots.
 *
 * Kept dependency-free (no mongoose, no path aliases) so the business rules
 * can be unit-tested with `node --test` and reused from both the server
 * services and the admin UI.
 */

export type SlotAvailability = "available" | "limited" | "unavailable";
export type SlotStatus = "active" | "inactive" | "full";

/** Slots whose remaining capacity is at most this share are "limited". */
const LIMITED_SHARE = 0.2;

/**
 * Parse a clock string to minutes since midnight.
 * Accepts 24h "HH:MM" (canonical, admin-configured) and the legacy
 * "hh:MM AM/PM" values that older pickups were written with.
 * Returns null when the value cannot be interpreted.
 */
export function parseClockToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^\s*(\d{1,2}):(\d{2})\s*([AaPp][Mm])?\s*$/.exec(value);
  if (!match) return null;

  const rawHours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(rawHours) || Number.isNaN(minutes) || minutes > 59) return null;

  const meridiem = match[3] ? match[3].toUpperCase() : null;
  if (!meridiem) {
    if (rawHours > 23) return null;
    return rawHours * 60 + minutes;
  }
  if (rawHours < 1 || rawHours > 12) return null;
  const hour12 = rawHours % 12 + (meridiem === "PM" ? 12 : 0);
  return hour12 * 60 + minutes;
}

/**
 * Stable identity for a booking's time window: "<startMinutes>-<endMinutes>".
 * Legacy bookings with "11:00 AM" collapse onto the canonical "11:00" slot.
 * Unparsable windows fall back to a raw-verbatim key so identical legacy
 * strings still group together.
 */
export function windowKey(startTime: string, endTime: string): string {
  const start = parseClockToMinutes(startTime);
  const end = parseClockToMinutes(endTime);
  if (start === null || end === null) {
    return `raw:${(startTime ?? "").trim()}|${(endTime ?? "").trim()}`;
  }
  return `${start}-${end}`;
}

/** Effective (possibly overridden) capacity for a slot on a given date. */
export function effectiveCapacityOf(
  regularCapacity: number,
  overrideCapacity?: number | null
): number {
  return typeof overrideCapacity === "number" && overrideCapacity >= 0
    ? overrideCapacity
    : regularCapacity;
}

export function remainingOf(capacity: number, booked: number): number {
  return Math.max(0, capacity - booked);
}

export function availabilityOf(capacity: number, booked: number): SlotAvailability {
  if (booked >= capacity) return "unavailable";
  const limitedThreshold = Math.max(1, Math.ceil(capacity * LIMITED_SHARE));
  if (capacity - booked <= limitedThreshold) return "limited";
  return "available";
}

/** Admin-facing status: Inactive wins, then Full, else Active. */
export function slotStatus(params: {
  isActive: boolean;
  capacity: number;
  booked: number;
}): SlotStatus {
  if (!params.isActive) return "inactive";
  if (params.booked >= params.capacity) return "full";
  return "active";
}

/** Message used when capacity may not drop below existing bookings. */
export function capacityBelowBookingsMessage(booked: number): string {
  return `Capacity cannot be lower than existing bookings (${booked})`;
}

export function isSlotFull(capacity: number, booked: number): boolean {
  return booked >= capacity;
}
