import mongoose from "mongoose";
import TimeSlot from "@/models/TimeSlot";
import TimeSlotOverride from "@/models/TimeSlotOverride";
import SlotDayState from "@/models/SlotDayState";
import Pickup from "@/models/Pickup";
import connectDB from "@/lib/db/mongoose";
import { ApiError } from "@/lib/utils/api-error";
import type {
  CreateTimeSlotInput,
  UpdateTimeSlotInput,
  UpsertTimeSlotOverrideInput,
} from "@/lib/validations/timeSlot";
import {
  istDayRange,
  isValidDateKey,
  todayIstKey,
} from "@/lib/utils/timezone";
import {
  availabilityOf,
  capacityBelowBookingsMessage,
  effectiveCapacityOf,
  remainingOf,
  slotStatus,
  windowKey,
  type SlotAvailability,
  type SlotStatus,
} from "@/lib/utils/slot-capacity";

export type TimeSlotAvailability = SlotAvailability;

export interface TimeSlotDTO {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  capacity: number;
  isActive: boolean;
  sortOrder: number;
  date: string;
  effectiveCapacity: number;
  booked: number;
  available: number;
  availability: TimeSlotAvailability;
  status: SlotStatus;
  hasOverride: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TimeSlotOverrideDTO {
  id: string;
  date: string;
  capacity: number;
  notes?: string;
  timeSlot: {
    id: string;
    label: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
  };
  booked: number;
  available: number;
  availability: TimeSlotAvailability;
  status: SlotStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResolvedBookingSlot {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  /** Regular capacity adjusted by the date's override, if any. */
  capacity: number;
}

interface SlotIdentity {
  id: string;
  startTime: string;
  endTime: string;
}

interface BookingCounts {
  byRef: Map<string, number>;
  byWindow: Map<string, number>;
}

function assertDateKey(dateKey: string): string {
  if (!isValidDateKey(dateKey)) {
    throw new ApiError(
      400,
      "Invalid date. Expected format YYYY-MM-DD.",
      "INVALID_DATE"
    );
  }
  return dateKey;
}

/** Validate a 24h "HH:MM" clock string and return minutes since midnight. */
function clockToMinutes(value: string, field: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    throw new ApiError(400, `Invalid ${field} time`, "INVALID_TIME");
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    throw new ApiError(400, `Invalid ${field} time`, "INVALID_TIME");
  }
  return hours * 60 + minutes;
}

function assertWindow(startTime: string, endTime: string): void {
  const start = clockToMinutes(startTime, "start");
  const end = clockToMinutes(endTime, "end");
  if (end <= start) {
    throw new ApiError(
      400,
      "End time must be after start time",
      "INVALID_TIME_WINDOW"
    );
  }
}

/**
 * Real (non-cancelled) bookings grouped by slot identity.
 *
 * New pickups carry a stable `timeSlotRef`; legacy pickups only stored a
 * display window whose format was not consistent ("11:00" vs "11:00 AM"),
 * so bookings without a reference are counted by their normalised window.
 */
async function loadBookingCounts(
  match: Record<string, unknown>
): Promise<BookingCounts> {
  const rows = await Pickup.find(match)
    .select({ timeSlot: 1, timeSlotRef: 1 })
    .lean();

  const byRef = new Map<string, number>();
  const byWindow = new Map<string, number>();

  for (const row of rows as unknown as Array<{
    timeSlot?: { startTime?: string; endTime?: string };
    timeSlotRef?: unknown;
  }>) {
    if (row.timeSlotRef) {
      const refKey = String(row.timeSlotRef);
      byRef.set(refKey, (byRef.get(refKey) ?? 0) + 1);
      continue;
    }
    const key = windowKey(
      row.timeSlot?.startTime ?? "",
      row.timeSlot?.endTime ?? ""
    );
    byWindow.set(key, (byWindow.get(key) ?? 0) + 1);
  }

  return { byRef, byWindow };
}

function countForSlot(slot: SlotIdentity, counts: BookingCounts): number {
  return (
    (counts.byRef.get(slot.id) ?? 0) +
    (counts.byWindow.get(windowKey(slot.startTime, slot.endTime)) ?? 0)
  );
}

/**
 * Lean documents have no `id` virtual, so build the counting identity from
 * `_id` explicitly — otherwise every slot would count as `undefined`.
 */
function toIdentity(doc: {
  _id: mongoose.Types.ObjectId;
  startTime: string;
  endTime: string;
}): SlotIdentity {
  return {
    id: doc._id.toString(),
    startTime: doc.startTime,
    endTime: doc.endTime,
  };
}

async function getBookedForDate(
  slots: SlotIdentity[],
  dateKey: string
): Promise<Map<string, number>> {
  const { start, end } = istDayRange(dateKey);
  const counts = await loadBookingCounts({
    scheduledDate: { $gte: start, $lt: end },
    status: { $ne: "cancelled" },
  });
  return new Map(slots.map((slot) => [slot.id, countForSlot(slot, counts)]));
}

/** Bookings for each slot from `from` onwards (no upper bound). */
async function getBookedFrom(
  slots: SlotIdentity[],
  from: Date
): Promise<Map<string, number>> {
  const counts = await loadBookingCounts({
    scheduledDate: { $gte: from },
    status: { $ne: "cancelled" },
  });
  return new Map(slots.map((slot) => [slot.id, countForSlot(slot, counts)]));
}

async function getOverridesForDate(
  dateKey: string
): Promise<Map<string, { capacity: number; notes?: string }>> {
  const rows = await TimeSlotOverride.find({ date: dateKey }).lean();
  return new Map(
    rows.map((row) => [
      String(row.timeSlot),
      { capacity: row.capacity, notes: row.notes || undefined },
    ])
  );
}

function serializeSlot(
  doc: {
    _id: mongoose.Types.ObjectId;
    label: string;
    startTime: string;
    endTime: string;
    capacity: number;
    isActive: boolean;
    sortOrder: number;
    createdAt?: Date;
    updatedAt?: Date;
  },
  params: {
    dateKey: string;
    booked: number;
    override?: { capacity: number } | null;
  }
): TimeSlotDTO {
  const effectiveCapacity = effectiveCapacityOf(
    doc.capacity,
    params.override?.capacity
  );

  return {
    id: doc._id.toString(),
    label: doc.label,
    startTime: doc.startTime,
    endTime: doc.endTime,
    capacity: doc.capacity,
    isActive: doc.isActive,
    sortOrder: doc.sortOrder,
    date: params.dateKey,
    effectiveCapacity,
    booked: params.booked,
    available: remainingOf(effectiveCapacity, params.booked),
    availability: availabilityOf(effectiveCapacity, params.booked),
    status: slotStatus({
      isActive: doc.isActive,
      capacity: effectiveCapacity,
      booked: params.booked,
    }),
    hasOverride: Boolean(params.override),
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
  };
}

/** Active slots with real availability for the customer booking flow. */
export async function listActiveTimeSlots(
  dateKey: string = todayIstKey()
): Promise<TimeSlotDTO[]> {
  await connectDB();
  assertDateKey(dateKey);

  const slots = await TimeSlot.find({ isActive: true })
    .sort({ sortOrder: 1, startTime: 1 })
    .lean();

  const [overrides, booked] = await Promise.all([
    getOverridesForDate(dateKey),
    getBookedForDate(slots.map(toIdentity), dateKey),
  ]);

  return slots.map((slot) =>
    serializeSlot(slot, {
      dateKey,
      booked: booked.get(slot._id.toString()) ?? 0,
      override: overrides.get(slot._id.toString()) ?? null,
    })
  );
}

/** All slots (active + hidden) with availability for the admin panel. */
export async function listAdminTimeSlots(
  dateKey: string = todayIstKey()
): Promise<TimeSlotDTO[]> {
  await connectDB();
  assertDateKey(dateKey);

  const slots = await TimeSlot.find({})
    .sort({ sortOrder: 1, startTime: 1 })
    .lean();

  const [overrides, booked] = await Promise.all([
    getOverridesForDate(dateKey),
    getBookedForDate(slots.map(toIdentity), dateKey),
  ]);

  return slots.map((slot) =>
    serializeSlot(slot, {
      dateKey,
      booked: booked.get(slot._id.toString()) ?? 0,
      override: overrides.get(slot._id.toString()) ?? null,
    })
  );
}

/** Date-specific overrides (Section B) with real booked/available counts. */
export async function listSlotOverrides(
  options: { dateKey?: string; timeSlotId?: string } = {}
): Promise<TimeSlotOverrideDTO[]> {
  await connectDB();

  const dateKey = assertDateKey(options.dateKey ?? todayIstKey());
  const filter: Record<string, unknown> = { date: dateKey };

  if (options.timeSlotId) {
    if (!mongoose.Types.ObjectId.isValid(options.timeSlotId)) {
      throw new ApiError(404, "Time slot not found", "NOT_FOUND");
    }
    filter.timeSlot = options.timeSlotId;
  }

  const rows = await TimeSlotOverride.find(filter)
    .sort({ createdAt: 1 })
    .lean();

  if (rows.length === 0) return [];

  const slotIds = rows.map((row) => row.timeSlot);
  const slots = await TimeSlot.find({ _id: { $in: slotIds } }).lean();
  const slotById = new Map(slots.map((slot) => [slot._id.toString(), slot]));

  const identities = slots.map((slot) => ({
    id: slot._id.toString(),
    startTime: slot.startTime,
    endTime: slot.endTime,
  }));
  const booked = await getBookedForDate(identities, dateKey);

  return rows
    .filter((row) => slotById.has(String(row.timeSlot)))
    .map((row) => {
      const slot = slotById.get(String(row.timeSlot))!;
      const count = booked.get(slot._id.toString()) ?? 0;
      return {
        id: row._id.toString(),
        date: row.date,
        capacity: row.capacity,
        notes: row.notes || undefined,
        timeSlot: {
          id: slot._id.toString(),
          label: slot.label,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isActive: slot.isActive,
        },
        booked: count,
        available: remainingOf(row.capacity, count),
        availability: availabilityOf(row.capacity, count),
        status: slotStatus({
          isActive: slot.isActive,
          capacity: row.capacity,
          booked: count,
        }),
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
        updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
      };
    });
}

export async function createTimeSlot(
  input: CreateTimeSlotInput
): Promise<TimeSlotDTO> {
  await connectDB();

  assertWindow(input.startTime, input.endTime);

  const duplicate = await TimeSlot.findOne({
    startTime: input.startTime,
    endTime: input.endTime,
  }).lean();
  if (duplicate) {
    throw new ApiError(
      409,
      "A time slot with this time window already exists",
      "DUPLICATE_TIME_SLOT"
    );
  }

  const slot = await TimeSlot.create({
    label: input.label.trim(),
    startTime: input.startTime,
    endTime: input.endTime,
    capacity: input.capacity ?? 20,
    isActive: input.isActive ?? true,
    sortOrder: input.sortOrder ?? 0,
  });

  return serializeSlot(slot.toObject(), { dateKey: todayIstKey(), booked: 0 });
}

export async function updateTimeSlot(
  id: string,
  input: UpdateTimeSlotInput
): Promise<TimeSlotDTO> {
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, "Time slot not found", "NOT_FOUND");
  }

  const existing = await TimeSlot.findById(id).lean();
  if (!existing) {
    throw new ApiError(404, "Time slot not found", "NOT_FOUND");
  }

  const startTime = input.startTime ?? existing.startTime;
  const endTime = input.endTime ?? existing.endTime;
  assertWindow(startTime, endTime);

  // Capacity may never drop below bookings that exist for this slot from
  // today (IST) onwards — those bookings were made under the current limit.
  if (input.capacity !== undefined) {
    const { start } = istDayRange(todayIstKey());
    const booked = (
      await getBookedFrom(
        [
          {
            id: existing._id.toString(),
            startTime: existing.startTime,
            endTime: existing.endTime,
          },
        ],
        start
      )
    ).get(existing._id.toString()) ?? 0;

    if (input.capacity < booked) {
      throw new ApiError(
        409,
        capacityBelowBookingsMessage(booked),
        "CAPACITY_BELOW_BOOKINGS",
        [{ capacity: input.capacity, booked }]
      );
    }
  }

  if (
    (input.startTime !== undefined && input.startTime !== existing.startTime) ||
    (input.endTime !== undefined && input.endTime !== existing.endTime)
  ) {
    const duplicate = await TimeSlot.findOne({
      _id: { $ne: id },
      startTime,
      endTime,
    }).lean();
    if (duplicate) {
      throw new ApiError(
        409,
        "A time slot with this time window already exists",
        "DUPLICATE_TIME_SLOT"
      );
    }
  }

  const updates: Record<string, unknown> = {};
  if (input.label !== undefined) updates.label = input.label.trim();
  if (input.startTime !== undefined) updates.startTime = input.startTime;
  if (input.endTime !== undefined) updates.endTime = input.endTime;
  if (input.capacity !== undefined) updates.capacity = input.capacity;
  if (input.isActive !== undefined) updates.isActive = input.isActive;
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;

  const slot = await TimeSlot.findByIdAndUpdate(id, updates, {
    returnDocument: "after",
    runValidators: true,
  }).lean();

  if (!slot) {
    throw new ApiError(404, "Time slot not found", "NOT_FOUND");
  }

  const dateKey = todayIstKey();
  const [overrides, bookedMap] = await Promise.all([
    getOverridesForDate(dateKey),
    getBookedForDate(
      [
        {
          id: slot._id.toString(),
          startTime: slot.startTime,
          endTime: slot.endTime,
        },
      ],
      dateKey
    ),
  ]);

  return serializeSlot(slot, {
    dateKey,
    booked: bookedMap.get(slot._id.toString()) ?? 0,
    override: overrides.get(slot._id.toString()) ?? null,
  });
}

export async function deleteTimeSlot(id: string): Promise<void> {
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, "Time slot not found", "NOT_FOUND");
  }

  const slot = await TimeSlot.findByIdAndDelete(id).lean();
  if (!slot) {
    throw new ApiError(404, "Time slot not found", "NOT_FOUND");
  }

  // Bookings are never deleted; only this slot's own overrides/counters go.
  await Promise.all([
    TimeSlotOverride.deleteMany({ timeSlot: slot._id }),
    SlotDayState.deleteMany({ timeSlot: slot._id }),
  ]);
}

/**
 * Create (or update) the capacity override for one slot on one date.
 * An override always replaces the regular capacity for that exact day.
 */
export async function upsertSlotOverride(
  input: UpsertTimeSlotOverrideInput
): Promise<TimeSlotOverrideDTO> {
  await connectDB();

  const dateKey = assertDateKey(input.date);

  if (!mongoose.Types.ObjectId.isValid(input.timeSlotId)) {
    throw new ApiError(404, "Time slot not found", "NOT_FOUND");
  }

  const slot = await TimeSlot.findById(input.timeSlotId).lean();
  if (!slot) {
    throw new ApiError(404, "Time slot not found", "NOT_FOUND");
  }

  const booked =
    (
      await getBookedForDate(
        [
          {
            id: slot._id.toString(),
            startTime: slot.startTime,
            endTime: slot.endTime,
          },
        ],
        dateKey
      )
    ).get(slot._id.toString()) ?? 0;

  if (input.capacity < booked) {
    throw new ApiError(
      409,
      capacityBelowBookingsMessage(booked),
      "CAPACITY_BELOW_BOOKINGS",
      [{ date: dateKey, capacity: input.capacity, booked }]
    );
  }

  const update: Record<string, unknown> = { capacity: input.capacity };
  if (input.notes !== undefined) {
    update.notes = input.notes.trim() || null;
  }

  let row: Record<string, unknown> | null = null;
  try {
    row = await TimeSlotOverride.findOneAndUpdate(
      { timeSlot: slot._id, date: dateKey },
      { $set: update },
      { returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();
  } catch (error) {
    // Concurrent upserts can race on the unique {timeSlot, date} index.
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      row = await TimeSlotOverride.findOneAndUpdate(
        { timeSlot: slot._id, date: dateKey },
        { $set: update },
        { returnDocument: "after", runValidators: true }
      ).lean();
    } else {
      throw error;
    }
  }

  if (!row) {
    throw new ApiError(500, "Failed to save override", "OVERRIDE_SAVE_FAILED");
  }

  return {
    id: String(row._id),
    date: String(row.date),
    capacity: Number(row.capacity),
    notes: (row.notes as string | null | undefined) || undefined,
    timeSlot: {
      id: slot._id.toString(),
      label: slot.label,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isActive: slot.isActive,
    },
    booked,
    available: remainingOf(row.capacity as number, booked),
    availability: availabilityOf(row.capacity as number, booked),
    status: slotStatus({
      isActive: slot.isActive,
      capacity: row.capacity as number,
      booked,
    }),
    createdAt: row.createdAt ? new Date(row.createdAt as Date).toISOString() : undefined,
    updatedAt: row.updatedAt ? new Date(row.updatedAt as Date).toISOString() : undefined,
  };
}

/** Remove a date-specific override, only if the regular capacity still fits. */
export async function deleteSlotOverride(id: string): Promise<void> {
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, "Override not found", "NOT_FOUND");
  }

  const row = await TimeSlotOverride.findById(id).lean();
  if (!row) {
    throw new ApiError(404, "Override not found", "NOT_FOUND");
  }

  const slot = await TimeSlot.findById(row.timeSlot).lean();
  if (slot) {
    const booked =
      (
        await getBookedForDate(
          [
            {
              id: slot._id.toString(),
              startTime: slot.startTime,
              endTime: slot.endTime,
            },
          ],
          row.date
        )
      ).get(slot._id.toString()) ?? 0;

    if (slot.capacity < booked) {
      throw new ApiError(
        409,
        `Removing this override would drop capacity below existing bookings. Regular capacity ${slot.capacity}, booked ${booked}.`,
        "CAPACITY_BELOW_BOOKINGS",
        [{ date: row.date, capacity: slot.capacity, booked }]
      );
    }
  }

  await TimeSlotOverride.deleteOne({ _id: row._id });
}

/**
 * Server-side booking validation (spec §17): the submitted window must match
 * an ACTIVE slot, and the returned capacity already includes the date's
 * override so the caller can enforce it atomically.
 */
export async function findActiveTimeSlotForDate(
  startTime: string,
  endTime: string,
  dateKey: string
): Promise<ResolvedBookingSlot | null> {
  await connectDB();
  assertDateKey(dateKey);

  const slot = await TimeSlot.findOne({
    isActive: true,
    startTime,
    endTime,
  }).lean();

  if (!slot) return null;

  const override = await TimeSlotOverride.findOne({
    timeSlot: slot._id,
    date: dateKey,
  }).lean();

  return {
    id: slot._id.toString(),
    label: slot.label,
    startTime: slot.startTime,
    endTime: slot.endTime,
    capacity: effectiveCapacityOf(slot.capacity, override?.capacity),
  };
}

/**
 * A counter that has not moved for this long cannot be holding an
 * in-flight reservation (claiming a seat takes milliseconds), so it is
 * safe to reconcile it against the real booking count.
 */
const STALE_COUNTER_MS = 60_000;

/**
 * Atomically claim one unit of capacity for a slot on a date.
 *
 * No check-then-insert: the seat is taken by a single conditional update
 * (`booked < capacity` → `$inc`), so concurrent requests can never both slip
 * past a full slot. When that update finds no room the code distinguishes a
 * genuinely full slot (real bookings >= capacity → 409 SLOT_FULL) from a
 * stale counter left behind by a crashed booking, which is repaired only
 * after it has been quiet long enough to be trusted.
 *
 * Availability shown to users always comes from the real pickup count;
 * this counter exists purely to make the claim atomic.
 */
export async function reserveSlotCapacity(
  slot: SlotIdentity,
  dateKey: string,
  capacity: number
): Promise<void> {
  await connectDB();
  assertDateKey(dateKey);

  // 1. Ensure the day's counter exists (idempotent, equality-only filter).
  await SlotDayState.updateOne(
    { timeSlot: slot.id, date: dateKey },
    { $setOnInsert: { booked: 0 } },
    { upsert: true }
  );

  // 2. Fast path: claim a seat if one is still free.
  const claim = () =>
    SlotDayState.findOneAndUpdate(
      { timeSlot: slot.id, date: dateKey, booked: { $lt: capacity } },
      { $inc: { booked: 1 } },
      { returnDocument: "after" }
    );

  if (await claim()) return;

  // 3. No seat — real bookings tell us whether the slot is truly full.
  const real = (await getBookedForDate([slot], dateKey)).get(slot.id) ?? 0;
  if (real >= capacity) {
    throw new ApiError(
      409,
      "This time slot is fully booked for the selected date. Please choose another time.",
      "SLOT_FULL"
    );
  }

  // 4. The counter is above reality (a booking that died before it wrote).
  // Repair it only when it has been idle, then try once more to claim.
  const healed = await SlotDayState.findOneAndUpdate(
    {
      timeSlot: slot.id,
      date: dateKey,
      booked: { $gt: real },
      updatedAt: { $lt: new Date(Date.now() - STALE_COUNTER_MS) },
    },
    { $set: { booked: real } },
    { returnDocument: "after" }
  );

  if (healed && (await claim())) return;

  throw new ApiError(
    409,
    "This time slot is fully booked for the selected date. Please choose another time.",
    "SLOT_FULL"
  );
}

/** Give one unit of capacity back (cancelled pickup or failed booking). */
export async function releaseSlotCapacity(
  slotId: string,
  dateKey: string
): Promise<void> {
  await connectDB();

  await SlotDayState.updateOne(
    { timeSlot: slotId, date: dateKey, booked: { $gt: 0 } },
    { $inc: { booked: -1 } }
  );
}

const timeSlotService = {
  listActiveTimeSlots,
  listAdminTimeSlots,
  listSlotOverrides,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
  upsertSlotOverride,
  deleteSlotOverride,
  findActiveTimeSlotForDate,
  reserveSlotCapacity,
  releaseSlotCapacity,
};

export default timeSlotService;
