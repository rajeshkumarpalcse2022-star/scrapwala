import mongoose from "mongoose";
import connectDB from "@/lib/db/mongoose";
import { ApiError } from "@/lib/utils/api-error";
import CallbackRequest from "@/models/CallbackRequest";
import Counter from "@/models/Counter";
import type {
  CallbackReason,
  CallbackStatus,
  CreateCallbackRequestInput,
  ListCallbackRequestsInput,
} from "@/lib/validations/callback";

export interface CallbackRequestDTO {
  id: string;
  requestId: string;
  name: string;
  phone: string;
  reasonType: CallbackReason;
  customReason?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  status: CallbackStatus;
  seenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function serialize(doc: {
  _id: mongoose.Types.ObjectId;
  requestId: string;
  name: string;
  phone: string;
  reasonType: CallbackReason;
  customReason?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  status: CallbackStatus;
  seenAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}): CallbackRequestDTO {
  return {
    id: doc._id.toString(),
    requestId: doc.requestId,
    name: doc.name,
    phone: doc.phone,
    reasonType: doc.reasonType,
    customReason: doc.customReason ?? null,
    latitude: doc.latitude ?? null,
    longitude: doc.longitude ?? null,
    address: doc.address ?? null,
    status: doc.status,
    seenAt: doc.seenAt ? new Date(doc.seenAt).toISOString() : null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : "",
  };
}

async function generateRequestId(): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { key: "callback_request" },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  ).lean<{ sequence: number }>();
  return `CB-${String(counter?.sequence ?? 1).padStart(6, "0")}`;
}

export async function createCallbackRequest(
  input: CreateCallbackRequestInput,
  userId?: string
): Promise<CallbackRequestDTO> {
  await connectDB();

  const requestId = await generateRequestId();

  const created = await CallbackRequest.create({
    requestId,
    name: input.name.trim(),
    phone: input.phone.trim(),
    reasonType: input.reasonType,
    customReason: input.customReason?.trim() || undefined,
    latitude: input.latitude ?? undefined,
    longitude: input.longitude ?? undefined,
    address: input.address?.trim() || undefined,
    user:
      userId && mongoose.Types.ObjectId.isValid(userId) ? userId : undefined,
  });

  return serialize(created.toObject());
}

export async function listCallbackRequests(
  input: ListCallbackRequestsInput
): Promise<{
  items: CallbackRequestDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  await connectDB();

  const filter: Record<string, unknown> = {};
  if (input.status) filter.status = input.status;
  if (input.search) {
    const escaped = input.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    filter.$or = [{ name: regex }, { phone: regex }, { requestId: regex }];
  }

  const [total, docs] = await Promise.all([
    CallbackRequest.countDocuments(filter),
    CallbackRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip((input.page - 1) * input.limit)
      .limit(input.limit)
      .lean(),
  ]);

  return {
    items: docs.map(serialize),
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.limit)),
    },
  };
}

export async function getUnseenCallbackCount(): Promise<number> {
  await connectDB();
  return CallbackRequest.countDocuments({ seenAt: null });
}

/** Marks every still-unseen callback request as seen. Returns the count. */
export async function markAllCallbacksSeen(): Promise<{ updated: number }> {
  await connectDB();
  const result = await CallbackRequest.updateMany(
    { seenAt: null },
    { $set: { seenAt: new Date() } }
  );
  return { updated: result.modifiedCount ?? 0 };
}

export async function updateCallbackStatus(
  id: string,
  status: CallbackStatus
): Promise<CallbackRequestDTO> {
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, "Callback request not found", "NOT_FOUND");
  }

  const updated = await CallbackRequest.findByIdAndUpdate(
    id,
    { $set: { status } },
    { new: true }
  ).lean();

  if (!updated) {
    throw new ApiError(404, "Callback request not found", "NOT_FOUND");
  }

  return serialize(updated);
}
