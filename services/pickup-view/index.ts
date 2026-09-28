import mongoose from "mongoose";
import PickupView, { PickupViewRole } from "@/models/PickupView";
import Pickup from "@/models/Pickup";
import User from "@/models/User";
import connectDB from "@/lib/db/mongoose";
import { ApiError } from "@/lib/utils/api-error";

/**
 * Records a freshly created pickup as UNSEEN for every current admin.
 *
 * Called only after the pickup document has been successfully created.
 * Idempotent: the unique { pickup, user, role } index plus an upsert with
 * $setOnInsert means a retried call never duplicates or resets records.
 */
export async function markNewPickupUnseenForAdmins(
  pickupId: mongoose.Types.ObjectId | string
): Promise<void> {
  await connectDB();

  const admins = await User.find({ role: "admin" }).select("_id").lean();

  if (admins.length === 0) {
    return;
  }

  const pickup = new mongoose.Types.ObjectId(String(pickupId));

  await PickupView.bulkWrite(
    admins.map((admin) => ({
      updateOne: {
        filter: { pickup, user: admin._id, role: "admin" as const },
        update: { $setOnInsert: { seenAt: null } },
        upsert: true,
      },
    }))
  );
}

/**
 * Records a freshly assigned pickup as UNSEEN for the assigned collector.
 *
 * Called only after the assignment has been persisted. On reassignment the
 * previous collector's view record for this pickup is removed so the unseen
 * state can never leak between collectors. Idempotent via upsert.
 */
export async function markNewPickupUnseenForCollector(
  pickupId: mongoose.Types.ObjectId | string,
  collectorId: string,
  previousCollectorId?: string | null
): Promise<void> {
  await connectDB();

  const pickup = new mongoose.Types.ObjectId(String(pickupId));
  const collector = new mongoose.Types.ObjectId(collectorId);

  if (
    previousCollectorId &&
    previousCollectorId !== collectorId &&
    mongoose.Types.ObjectId.isValid(previousCollectorId)
  ) {
    await PickupView.deleteOne({
      pickup,
      user: new mongoose.Types.ObjectId(previousCollectorId),
      role: "collector",
    });
  }

  await PickupView.updateOne(
    { pickup, user: collector, role: "collector" },
    { $set: { seenAt: null } },
    { upsert: true }
  );
}

/**
 * Number of pickups that are on this user's radar but not opened yet:
 * unseen view records that still resolve to a real pickup (and, for
 * collectors, to a pickup still assigned to them).
 */
export async function getUnseenPickupCount(
  userId: string,
  role: PickupViewRole
): Promise<number> {
  await connectDB();

  const user = new mongoose.Types.ObjectId(userId);

  const views = await PickupView.find({ user, role, seenAt: null })
    .select("pickup")
    .lean();

  if (views.length === 0) {
    return 0;
  }

  const query: Record<string, unknown> = {
    _id: { $in: views.map((view) => view.pickup) },
  };

  if (role === "collector") {
    query.collector = user;
  }

  return Pickup.countDocuments(query);
}

/**
 * Marks a pickup as seen for this user+role. Idempotent (upsert on the
 * unique key), never touches the pickup document itself.
 *
 * Admins can only mark pickups that exist. Collectors can only mark
 * pickups currently assigned to them.
 */
export async function markPickupSeen(
  pickupId: string,
  userId: string,
  role: PickupViewRole
): Promise<void> {
  await connectDB();

  const filter: Record<string, unknown> = { pickupId };

  if (role === "collector") {
    filter.collector = new mongoose.Types.ObjectId(userId);
  }

  const pickup = await Pickup.findOne(filter).select("_id").lean();

  if (!pickup) {
    throw new ApiError(404, "Pickup not found", "NOT_FOUND");
  }

  await PickupView.updateOne(
    { pickup: pickup._id, user: new mongoose.Types.ObjectId(userId), role },
    { $set: { seenAt: new Date() } },
    { upsert: true }
  );
}
