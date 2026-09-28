import mongoose from "mongoose";
import TimeSlot from "@/models/TimeSlot";
import Pickup from "@/models/Pickup";
import connectDB from "@/lib/db/mongoose";
import { ApiError } from "@/lib/utils/api-error";
import type {
  CreateTimeSlotInput,
  UpdateTimeSlotInput,
} from "@/lib/validations/timeSlot";

export type TimeSlotAvailability = "available" | "limited" | "unavailable";

export interface TimeSlotDTO {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  capacity: number;
  isActive: boolean;
  sortOrder: number;
  booked: number;
  availability: TimeSlotAvailability;
  createdAt?: string;
  updatedAt?: string;
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

function availabilityOf(
  capacity: number,
  booked: number
): TimeSlotAvailability {
  if (booked >= capacity) return "unavailable";
  const limitedThreshold = Math.max(1, Math.ceil(capacity * 0.2));
  if (capacity - booked <= limitedThreshold) return "limited";
  return "available";
}

/**
 * Today's non-cancelled bookings per slot start time.
 * Capacity semantics are per day: slot capacity is checked against
 * bookings scheduled for today with the same start time.
 */
async function getBookedToday(): Promise<Map<string, number>> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const rows: Array<{ _id: string | null; count: number }> =
    await Pickup.aggregate([
      {
        $match: {
          scheduledDate: { $gte: start, $lt: end },
          status: { $ne: "cancelled" },
        },
      },
      { $group: { _id: "$timeSlot.startTime", count: { $sum: 1 } } },
    ]);

  return new Map(
    rows.filter((row) => row._id != null).map((row) => [row._id!, row.count])
  );
}

function serialize(
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
  booked: number
): TimeSlotDTO {
  return {
    id: doc._id.toString(),
    label: doc.label,
    startTime: doc.startTime,
    endTime: doc.endTime,
    capacity: doc.capacity,
    isActive: doc.isActive,
    sortOrder: doc.sortOrder,
    booked,
    availability: availabilityOf(doc.capacity, booked),
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
  };
}

/** Active slots for the customer booking flow. */
export async function listActiveTimeSlots(): Promise<TimeSlotDTO[]> {
  await connectDB();

  const [slots, booked] = await Promise.all([
    TimeSlot.find({ isActive: true })
      .sort({ sortOrder: 1, startTime: 1 })
      .lean(),
    getBookedToday(),
  ]);

  return slots.map((slot) => serialize(slot, booked.get(slot.startTime) ?? 0));
}

/** All slots (active + hidden) for the admin panel. */
export async function listAdminTimeSlots(): Promise<TimeSlotDTO[]> {
  await connectDB();

  const [slots, booked] = await Promise.all([
    TimeSlot.find({}).sort({ sortOrder: 1, startTime: 1 }).lean(),
    getBookedToday(),
  ]);

  return slots.map((slot) => serialize(slot, booked.get(slot.startTime) ?? 0));
}

export async function createTimeSlot(
  input: CreateTimeSlotInput
): Promise<TimeSlotDTO> {
  await connectDB();

  assertWindow(input.startTime, input.endTime);

  const slot = await TimeSlot.create({
    label: input.label.trim(),
    startTime: input.startTime,
    endTime: input.endTime,
    capacity: input.capacity ?? 20,
    isActive: input.isActive ?? true,
    sortOrder: input.sortOrder ?? 0,
  });

  return serialize(slot.toObject(), 0);
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

  const updates: Record<string, unknown> = {};
  if (input.label !== undefined) updates.label = input.label.trim();
  if (input.startTime !== undefined) updates.startTime = input.startTime;
  if (input.endTime !== undefined) updates.endTime = input.endTime;
  if (input.capacity !== undefined) updates.capacity = input.capacity;
  if (input.isActive !== undefined) updates.isActive = input.isActive;
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;

  const slot = await TimeSlot.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  }).lean();

  if (!slot) {
    throw new ApiError(404, "Time slot not found", "NOT_FOUND");
  }

  const booked = (await getBookedToday()).get(slot.startTime) ?? 0;
  return serialize(slot, booked);
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
}

/**
 * Server-side booking validation (spec §17): the submitted time window
 * must match an ACTIVE admin-configured slot.
 */
export async function findActiveTimeSlot(
  startTime: string,
  endTime: string
): Promise<{ id: string; capacity: number } | null> {
  await connectDB();

  const slot = await TimeSlot.findOne({
    isActive: true,
    startTime,
    endTime,
  })
    .select("capacity")
    .lean();

  if (!slot) return null;
  return { id: slot._id.toString(), capacity: slot.capacity };
}

const timeSlotService = {
  listActiveTimeSlots,
  listAdminTimeSlots,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
  findActiveTimeSlot,
};

export default timeSlotService;
