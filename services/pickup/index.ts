import mongoose from "mongoose";
import Pickup, { IPickup } from "@/models/Pickup";
import Counter from "@/models/Counter";
import User from "@/models/User";
import connectDB from "@/lib/db/mongoose";
import { ApiError } from "@/lib/utils/api-error";
import type { CreatePickupInput } from "@/lib/validations/pickup";
import { getActiveRateBySubcategory } from "@/services/rate";
import { resolvePickupSubcategory } from "@/services/category";
import { createNotification } from "@/services/notification";
import {
  markNewPickupUnseenForAdmins,
  markNewPickupUnseenForCollector,
} from "@/services/pickup-view";
import { checkServiceabilityByLocation } from "@/services/location";
import { findActiveTimeSlot } from "@/services/time-slot";
import { PICKUP_STATUS_LABELS } from "@/lib/constants/pickup";

async function generatePickupId(): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { key: "pickup" },
    { $inc: { sequence: 1 } },
    { upsert: true, new: true }
  );

  return `PU-${String(counter.sequence).padStart(6, "0")}`;
}

export async function createPickup(
  data: CreatePickupInput,
  customerId: string
): Promise<IPickup> {
  await connectDB();

  const scheduledDate = new Date(data.scheduledDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (scheduledDate < today) {
    throw new ApiError(400, "Pickup date cannot be in the past", "INVALID_DATE");
  }

  // Server-authoritative serviceability from the confirmed coordinates
  // (spec §17) — rejected BEFORE any pickup document or counter is written.
  const serviceability = await checkServiceabilityByLocation(
    data.address.latitude,
    data.address.longitude,
    data.address.pinCode
  );

  if (!serviceability.serviceable) {
    throw new ApiError(
      400,
      "We don't serve this location yet.",
      "NOT_SERVICEABLE"
    );
  }

  // The submitted window must match an active admin-configured slot (§17).
  const timeSlot = await findActiveTimeSlot(
    data.timeSlot.startTime,
    data.timeSlot.endTime
  );

  if (!timeSlot) {
    throw new ApiError(
      400,
      "Selected time slot is no longer available",
      "INVALID_TIME_SLOT"
    );
  }

  const pickupId = await generatePickupId();

  const items = await Promise.all(
    data.items.map(async (item) => {
      const resolved = await resolvePickupSubcategory(
        item.category,
        item.categoryName
      );
      return {
        category: resolved.id,
        categoryName: resolved.name,
        rate: item.rate,
        unit: item.unit,
        estimatedWeight: item.estimatedWeight,
        amount: item.amount,
      };
    })
  );

  const estimatedAmount = items.reduce((sum, item) => sum + item.amount, 0);

  const pickup = await Pickup.create({
    pickupId,
    customer: new mongoose.Types.ObjectId(customerId),
    vehicle: data.vehicle,
    address: {
      fullName: data.address.fullName,
      phone: data.address.phone,
      houseFlatBuilding: data.address.houseFlatBuilding,
      streetArea: data.address.streetArea,
      landmark: data.address.landmark || undefined,
      city: data.address.city,
      state: data.address.state,
      pinCode: data.address.pinCode,
      addressType: data.address.addressType || undefined,
      latitude: data.address.latitude,
      longitude: data.address.longitude,
    },
    location: serviceability.location
      ? new mongoose.Types.ObjectId(serviceability.location.id)
      : undefined,
    scheduledDate,
    timeSlot: {
      startTime: data.timeSlot.startTime,
      endTime: data.timeSlot.endTime,
    },
    items,
    expectedWeight: data.expectedWeight,
    estimatedAmount,
    actualAmount: 0,
    status: "scheduled",
    paymentStatus: "pending",
    notes: data.notes || undefined,
  });

  // The pickup exists now: put it on every admin's unseen radar. Failures
  // must never break the customer's booking (mirrors assignment notify).
  try {
    await markNewPickupUnseenForAdmins(pickup._id);
  } catch (error) {
    console.error(
      `Failed to record unseen pickup for admins on ${pickup.pickupId}:`,
      error
    );
  }

  return pickup;
}

export async function getCustomerPickups(
  customerId: string,
  options: { page?: number; limit?: number; status?: string } = {}
) {
  await connectDB();

  const { page = 1, limit = 10, status } = options;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {
    customer: new mongoose.Types.ObjectId(customerId),
  };

  if (status) {
    query.status = status;
  }

  const [pickups, total] = await Promise.all([
    Pickup.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-__v -updatedAt")
      .lean(),
    Pickup.countDocuments(query),
  ]);

  return {
    pickups,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getCustomerPickupById(
  pickupId: string,
  customerId: string
): Promise<IPickup> {
  await connectDB();

  const pickup = await Pickup.findOne({
    pickupId,
    customer: new mongoose.Types.ObjectId(customerId),
  })
    .select("-__v -updatedAt")
    .lean();

  if (!pickup) {
    throw new ApiError(404, "Pickup not found", "NOT_FOUND");
  }

  return pickup;
}

const VALID_STATUSES = [
  "scheduled",
  "assigned",
  "accepted",
  "on_the_way",
  "arrived",
  "weighing",
  "payment_pending",
  "completed",
  "cancelled",
] as const;

export async function getAdminPickups(options: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  from?: string;
  to?: string;
}) {
  await connectDB();

  const { page = 1, limit = 20, status, search, from, to } = options;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};

  if (status) {
    if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
      throw new ApiError(400, "Invalid status value", "VALIDATION_ERROR");
    }
    query.status = status;
  }

  if (from || to) {
    const dateQuery: Record<string, Date> = {};
    if (from) {
      const fromDate = new Date(from);
      if (isNaN(fromDate.getTime())) {
        throw new ApiError(400, "Invalid from date", "VALIDATION_ERROR");
      }
      fromDate.setHours(0, 0, 0, 0);
      dateQuery.$gte = fromDate;
    }
    if (to) {
      const toDate = new Date(to);
      if (isNaN(toDate.getTime())) {
        throw new ApiError(400, "Invalid to date", "VALIDATION_ERROR");
      }
      toDate.setHours(23, 59, 59, 999);
      dateQuery.$lte = toDate;
    }
    query.scheduledDate = dateQuery;
  }

  if (search) {
    const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const matchingUsers = await User.find({
      $or: [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
      ],
    })
      .select("_id")
      .lean();

    const userIds = matchingUsers.map(
      (u) => new mongoose.Types.ObjectId(u._id.toString())
    );

    query.$or = [
      { pickupId: searchRegex },
      { customer: { $in: userIds } },
      { "address.fullName": searchRegex },
      { "address.phone": searchRegex },
    ];
  }

  const [pickups, total] = await Promise.all([
    Pickup.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-__v")
      .populate("customer", "name phone email role isVerified")
      .populate("collector", "name phone email role isActive")
      .lean(),
    Pickup.countDocuments(query),
  ]);

  return {
    items: pickups,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getAdminPickupById(pickupId: string) {
  await connectDB();

  const pickup = await Pickup.findOne({ pickupId })
    .select("-__v")
    .populate("customer", "name phone email role isVerified")
    .populate("collector", "name phone email role isActive")
    .lean();

  if (!pickup) {
    throw new ApiError(404, "Pickup not found", "NOT_FOUND");
  }

  return pickup;
}

export async function updateAdminPickupStatus(
  pickupId: string,
  status: string
) {
  await connectDB();

  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    throw new ApiError(400, "Invalid status value", "VALIDATION_ERROR");
  }

  const pickup = await Pickup.findOne({ pickupId });

  if (!pickup) {
    throw new ApiError(404, "Pickup not found", "NOT_FOUND");
  }

  pickup.status = status as IPickup["status"];
  await pickup.save();

  const updated = await Pickup.findOne({ pickupId })
    .select("-__v")
    .populate("customer", "name phone email role isVerified")
    .populate("collector", "name phone email role isActive")
    .lean();

  return updated;
}

export async function assignCollectorToPickup(
  pickupId: string,
  collectorId: string
) {
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(collectorId)) {
    throw new ApiError(400, "Invalid collector id", "INVALID_COLLECTOR_ID");
  }

  const pickup = await Pickup.findOne({ pickupId });

  if (!pickup) {
    throw new ApiError(404, "Pickup not found", "NOT_FOUND");
  }

  const previousCollectorId = pickup.collector
    ? pickup.collector.toString()
    : null;
  const collectorChanged = previousCollectorId !== collectorId;

  const collector = await User.findById(collectorId).select(
    "name phone email role isActive"
  );

  if (!collector) {
    throw new ApiError(404, "Collector not found", "NOT_FOUND");
  }

  if (collector.role !== "collector") {
    throw new ApiError(
      400,
      "User is not a collector",
      "INVALID_COLLECTOR_ROLE"
    );
  }

  if (!collector.isActive) {
    throw new ApiError(400, "Collector is not active", "INACTIVE_COLLECTOR");
  }

  pickup.collector = new mongoose.Types.ObjectId(collectorId);

  if (pickup.status === "scheduled") {
    pickup.status = "assigned";
  }

  await pickup.save();

  // Notify the newly assigned collector only when the assignment actually
  // changed. Re-submitting the same collector never duplicates the
  // notification, and reassignment always targets the new collector.
  if (collectorChanged) {
    try {
      await markNewPickupUnseenForCollector(
        pickup._id,
        collectorId,
        previousCollectorId
      );
    } catch (error) {
      console.error(
        `Failed to record unseen pickup for collector on pickup ${pickupId}:`,
        error
      );
    }

    try {
      await createNotification({
        recipient: collectorId,
        type: "pickup_assigned",
        title: "New Pickup Assigned",
        message: `A new pickup ${pickupId} has been assigned to you.`,
        metadata: { pickupId },
      });
    } catch (error) {
      // The assignment is already persisted; never fail the admin request
      // because the notification write failed.
      console.error(
        `Failed to create assignment notification for pickup ${pickupId}:`,
        error
      );
    }
  }

  const updated = await Pickup.findOne({ pickupId })
    .select("-__v")
    .populate("customer", "name phone email role isVerified")
    .populate("collector", "name phone email role isActive")
    .lean();

  return updated;
}

const COLLECTOR_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  assigned: ["accepted", "cancelled"],
  accepted: ["on_the_way", "cancelled"],
  on_the_way: ["arrived"],
  arrived: ["weighing"],
  weighing: ["payment_pending"],
  payment_pending: [],
};

export async function getCollectorPickups(
  collectorId: string,
  options: {
    page?: number;
    limit?: number;
    status?: string;
    from?: string;
    to?: string;
  } = {}
) {
  await connectDB();

  const { page = 1, limit = 20, status, from, to } = options;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {
    collector: new mongoose.Types.ObjectId(collectorId),
  };

  if (status) {
    if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
      throw new ApiError(400, "Invalid status value", "VALIDATION_ERROR");
    }
    query.status = status;
  }

  if (from || to) {
    const dateQuery: Record<string, Date> = {};
    if (from) {
      const fromDate = new Date(from);
      if (isNaN(fromDate.getTime())) {
        throw new ApiError(400, "Invalid from date", "VALIDATION_ERROR");
      }
      fromDate.setHours(0, 0, 0, 0);
      dateQuery.$gte = fromDate;
    }
    if (to) {
      const toDate = new Date(to);
      if (isNaN(toDate.getTime())) {
        throw new ApiError(400, "Invalid to date", "VALIDATION_ERROR");
      }
      toDate.setHours(23, 59, 59, 999);
      dateQuery.$lte = toDate;
    }
    query.scheduledDate = dateQuery;
  }

  const [pickups, total] = await Promise.all([
    Pickup.find(query)
      .sort({ scheduledDate: -1 })
      .skip(skip)
      .limit(limit)
      .select("-__v")
      .populate("customer", "name phone email")
      .lean(),
    Pickup.countDocuments(query),
  ]);

  return {
    items: pickups,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getCollectorPickupById(
  pickupId: string,
  collectorId: string
) {
  await connectDB();

  const pickup = await Pickup.findOne({
    pickupId,
    collector: new mongoose.Types.ObjectId(collectorId),
  })
    .select("-__v")
    .populate("customer", "name phone email")
    .lean();

  if (!pickup) {
    throw new ApiError(404, "Pickup not found", "NOT_FOUND");
  }

  return pickup;
}

export async function updateCollectorPickupStatus(
  pickupId: string,
  collectorId: string,
  newStatus: string
) {
  await connectDB();

  if (!VALID_STATUSES.includes(newStatus as (typeof VALID_STATUSES)[number])) {
    throw new ApiError(400, "Invalid status value", "VALIDATION_ERROR");
  }

  const pickup = await Pickup.findOne({
    pickupId,
    collector: new mongoose.Types.ObjectId(collectorId),
  });

  if (!pickup) {
    throw new ApiError(404, "Pickup not found", "NOT_FOUND");
  }

  const allowed = COLLECTOR_ALLOWED_TRANSITIONS[pickup.status];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new ApiError(
      400,
      `Cannot transition from "${pickup.status}" to "${newStatus}"`,
      "INVALID_STATUS_TRANSITION"
    );
  }

  // Validate weighing completion before allowing transition to payment_pending
  if (pickup.status === "weighing" && newStatus === "payment_pending") {
    if (!pickup.items || pickup.items.length === 0) {
      throw new ApiError(
        400,
        "Cannot proceed to payment: no items in pickup",
        "NO_ITEMS"
      );
    }

    const hasUnweighedItems = pickup.items.some(
      (item: { actualWeight?: number }) => item.actualWeight === undefined || item.actualWeight === null || item.actualWeight <= 0
    );

    if (hasUnweighedItems) {
      throw new ApiError(
        400,
        "Cannot proceed to payment: all items must have valid actual weights",
        "INCOMPLETE_WEIGHING"
      );
    }

    const hasMissingRates = pickup.items.some(
      (item: { rate?: number }) => item.rate === undefined || item.rate === null || item.rate < 0
    );

    if (hasMissingRates) {
      throw new ApiError(
        400,
        "Cannot proceed to payment: missing rates for weighed items",
        "MISSING_RATES"
      );
    }

    if (!pickup.actualAmount || pickup.actualAmount < 0) {
      throw new ApiError(
        400,
        "Cannot proceed to payment: actual amount not calculated",
        "INVALID_AMOUNT"
      );
    }
  }

  pickup.status = newStatus as IPickup["status"];
  await pickup.save();

  const updated = await Pickup.findOne({ pickupId })
    .select("-__v")
    .populate("customer", "name phone email")
    .lean();

  return updated;
}

export async function updateCollectorPickupWeighing(
  pickupId: string,
  collectorId: string,
  items: Array<{
    category: string;
    categoryName: string;
    actualWeight: number;
    rate: number;
    unit: "kg" | "piece" | "unit";
  }>
) {
  await connectDB();

  const pickup = await Pickup.findOne({
    pickupId,
    collector: new mongoose.Types.ObjectId(collectorId),
  });

  if (!pickup) {
    throw new ApiError(404, "Pickup not found", "NOT_FOUND");
  }

  if (pickup.status !== "weighing") {
    throw new ApiError(
      400,
      "Weighing can only be updated when pickup is in 'weighing' status",
      "INVALID_STATUS"
    );
  }

  const seenMaterials = new Set<string>();
  const updatedItems: Array<{
    category: mongoose.Types.ObjectId;
    categoryName: string;
    rate: number;
    unit: string;
    estimatedWeight: number;
    actualWeight?: number;
    amount: number;
  }> = [];

  for (const item of items) {
    if (!Number.isFinite(item.actualWeight) || item.actualWeight <= 0) {
      throw new ApiError(
        400,
        `Weight for "${item.categoryName}" must be greater than 0`,
        "INVALID_WEIGHT"
      );
    }
    if (!Number.isFinite(item.rate) || item.rate < 0) {
      throw new ApiError(
        400,
        `The entered rate for ${item.categoryName} is invalid`,
        "INVALID_RATE"
      );
    }

    // Resolve the active admin rate bounds for this subcategory (validates
    // that the material exists as an active catalog item too).
    const rateInfo = await getActiveRateBySubcategory(item.category, item.categoryName);

    if (seenMaterials.has(rateInfo.subcategoryId)) {
      throw new ApiError(
        400,
        `The material "${rateInfo.itemName}" is listed twice. Combine the weights into a single row.`,
        "DUPLICATE_MATERIAL"
      );
    }
    seenMaterials.add(rateInfo.subcategoryId);

    if (item.rate < rateInfo.minRate) {
      throw new ApiError(
        400,
        `The entered rate for ${rateInfo.itemName} is below the minimum allowed rate of ₹${rateInfo.minRate}/${rateInfo.unit}.`,
        "RATE_BELOW_MINIMUM"
      );
    }
    if (item.rate > rateInfo.maxRate) {
      throw new ApiError(
        400,
        `The entered rate for ${rateInfo.itemName} is above the maximum allowed rate of ₹${rateInfo.maxRate}/${rateInfo.unit}.`,
        "RATE_ABOVE_MAXIMUM"
      );
    }

    // Preserve existing booking fields when the row matches an original item.
    const existingItem = pickup.items.find(
      (i: { category?: mongoose.Types.ObjectId; categoryName: string }) =>
        (i.category && i.category.toString() === rateInfo.subcategoryId) ||
        i.categoryName === rateInfo.itemName
    );
    const base = existingItem ? existingItem.toObject() : { estimatedWeight: 0 };

    updatedItems.push({
      ...base,
      category: new mongoose.Types.ObjectId(rateInfo.subcategoryId),
      categoryName: rateInfo.itemName,
      actualWeight: item.actualWeight,
      rate: item.rate,
      unit: rateInfo.unit,
      amount: item.actualWeight * item.rate,
    });
  }

  const actualAmount = updatedItems.reduce((sum, item) => sum + item.amount, 0);

  pickup.items = updatedItems;
  pickup.actualAmount = actualAmount;
  await pickup.save();

  const updated = await Pickup.findOne({ pickupId })
    .select("-__v")
    .populate("customer", "name phone email")
    .lean();

  return updated;
}

export async function getCollectorStats(collectorId: string) {
  await connectDB();

  const collectorObjectId = new mongoose.Types.ObjectId(collectorId);

  const [assigned, accepted, inProgress, completed] = await Promise.all([
    Pickup.countDocuments({ collector: collectorObjectId, status: "assigned" }),
    Pickup.countDocuments({ collector: collectorObjectId, status: "accepted" }),
    Pickup.countDocuments({
      collector: collectorObjectId,
      status: { $in: ["on_the_way", "arrived", "weighing", "payment_pending"] },
    }),
    Pickup.countDocuments({ collector: collectorObjectId, status: "completed" }),
  ]);

  return {
    assigned,
    accepted,
    inProgress,
    completed,
  };
}

export type AnalyticsPeriod = "weekly" | "monthly" | "yearly";

const ANALYTICS_PERIODS = ["weekly", "monthly", "yearly"] as const;

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** Statuses in donut presentation order; unexpected legacy values are appended. */
const STATUS_ORDER = [
  "assigned",
  "accepted",
  "on_the_way",
  "arrived",
  "weighing",
  "payment_pending",
  "completed",
  "cancelled",
] as const;

export function isAnalyticsPeriod(value: string): value is AnalyticsPeriod {
  return (ANALYTICS_PERIODS as readonly string[]).includes(value);
}

function getAnalyticsRange(period: AnalyticsPeriod): { start: Date; end: Date } {
  const now = new Date();

  if (period === "weekly") {
    // Current week, Monday -> Sunday, in server-local time (matches the
    // setHours(0, 0, 0, 0) convention used by getCollectorPickups).
    const start = new Date(now);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (period === "monthly") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { start, end };
}

function getTrendLabels(period: AnalyticsPeriod, end: Date): string[] {
  if (period === "weekly") return [...WEEKDAY_LABELS];
  if (period === "yearly") return [...MONTH_LABELS];
  return Array.from({ length: end.getDate() }, (_, i) => String(i + 1));
}

/**
 * Real pickup analytics for ONE collector (session identity only).
 *
 * - Trend: pickups bucketed by scheduledDate inside the period window
 *   (Mon-Sun / days of month / Jan-Dec), counted per bucket.
 * - Status: same window, grouped by current status, with percentages.
 * - No customer fields are exposed.
 */
const RANGE_MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const RANGE_MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getRangeLabel(
  period: AnalyticsPeriod,
  start: Date,
  end: Date
): string {
  if (period === "weekly") {
    const sameMonth =
      start.getMonth() === end.getMonth() &&
      start.getFullYear() === end.getFullYear();
    const startPart = sameMonth
      ? String(start.getDate())
      : `${start.getDate()} ${RANGE_MONTHS_SHORT[start.getMonth()]}`;
    const endPart = `${end.getDate()} ${RANGE_MONTHS_SHORT[end.getMonth()]} ${end.getFullYear()}`;
    return `${startPart} – ${endPart}`;
  }
  if (period === "monthly") {
    return `${RANGE_MONTHS_LONG[end.getMonth()]} ${end.getFullYear()}`;
  }
  return `Year ${end.getFullYear()}`;
}

export async function getCollectorAnalytics(
  collectorId: string,
  period: AnalyticsPeriod
) {
  await connectDB();

  const { start, end } = getAnalyticsRange(period);
  const labels = getTrendLabels(period, end);

  const rows = await Pickup.find({
    collector: new mongoose.Types.ObjectId(collectorId),
    scheduledDate: { $gte: start, $lte: end },
  })
    .select("scheduledDate status")
    .lean();

  const counts = new Array(labels.length).fill(0);
  const statusCounts = new Map<string, number>();

  for (const row of rows) {
    const date = new Date(row.scheduledDate);
    let index = -1;
    if (period === "weekly") {
      index = (date.getDay() + 6) % 7;
    } else if (period === "yearly") {
      index = date.getMonth();
    } else if (date.getMonth() === start.getMonth() && date.getFullYear() === start.getFullYear()) {
      index = date.getDate() - 1;
    }
    if (index >= 0 && index < counts.length) counts[index] += 1;

    statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
  }

  const trend = labels.map((label, i) => ({ label, count: counts[i] }));

  const orderedStatuses: string[] = [
    ...STATUS_ORDER.filter((s) => statusCounts.has(s)),
    ...[...statusCounts.keys()].filter(
      (s) => !(STATUS_ORDER as readonly string[]).includes(s)
    ),
  ];

  const total = rows.length;
  const status = orderedStatuses.map((s) => {
    const count = statusCounts.get(s) ?? 0;
    return {
      status: s,
      label: PICKUP_STATUS_LABELS[s] ?? s,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });

  return { period, rangeLabel: getRangeLabel(period, start, end), trend, status, total };
}
