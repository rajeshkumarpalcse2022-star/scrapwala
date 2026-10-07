import mongoose from "mongoose";
import ScrapRate from "@/models/ScrapRate";
import ScrapCategory from "@/models/ScrapCategory";
import connectDB from "@/lib/db/mongoose";
import { ApiError } from "@/lib/utils/api-error";
import { slugify } from "@/lib/utils/slug";
import type { CreateRateInput, UpdateRateInput } from "@/lib/validations/rate";

export interface RateLookupResult {
  rate: number;
  unit: "kg" | "piece" | "unit";
  itemName: string;
}

export async function getActiveRateForMaterial(
  categoryId: string | mongoose.Types.ObjectId,
  materialName: string
): Promise<RateLookupResult> {
  await connectDB();

  const categoryObjectId =
    typeof categoryId === "string"
      ? new mongoose.Types.ObjectId(categoryId)
      : categoryId;

  const now = new Date();

  const rate = await ScrapRate.findOne({
    category: categoryObjectId,
    itemName: materialName,
    isActive: true,
    $and: [
      {
        $or: [
          { effectiveFrom: { $exists: false } },
          { effectiveFrom: { $lte: now } },
        ],
      },
      {
        $or: [
          { effectiveTo: { $exists: false } },
          { effectiveTo: { $gte: now } },
        ],
      },
    ],
  })
    .sort({ effectiveFrom: -1 })
    .lean();

  if (!rate) {
    throw new ApiError(
      404,
      `No active rate found for material "${materialName}" in this category`,
      "RATE_NOT_FOUND"
    );
  }

  return {
    rate: rate.minRate,
    unit: rate.unit,
    itemName: rate.itemName,
  };
}

export interface SubcategoryRateLookup {
  subcategoryId: string;
  itemName: string;
  minRate: number;
  maxRate: number;
  unit: "kg" | "piece" | "unit";
}

/**
 * Resolve the active admin rate bounds for a subcategory id. Independent of
 * the itemName stored on the rate document (survives subcategory renames) and
 * enforces that both the subcategory and its parent category are active.
 */
export async function getActiveRateBySubcategory(
  subcategoryId: string,
  fallbackName?: string
): Promise<SubcategoryRateLookup> {
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(subcategoryId)) {
    throw new ApiError(
      400,
      `Material "${fallbackName ?? subcategoryId}" is not a valid catalog item`,
      "INVALID_MATERIAL"
    );
  }

  const sub = await ScrapCategory.findOne({
    _id: subcategoryId,
    parent: { $ne: null },
    isActive: true,
  })
    .select("_id name parent")
    .lean();

  if (!sub) {
    throw new ApiError(
      400,
      `Material "${fallbackName ?? subcategoryId}" is not available in the catalog`,
      "INVALID_MATERIAL"
    );
  }

  const parent = sub.parent
    ? await ScrapCategory.findOne({
        _id: sub.parent,
        parent: null,
        isActive: true,
      })
        .select("_id")
        .lean()
    : null;

  if (!parent) {
    throw new ApiError(
      400,
      `Material "${sub.name}" is not available in the catalog`,
      "INVALID_MATERIAL"
    );
  }

  const now = new Date();
  const rate = await ScrapRate.findOne({
    category: sub._id,
    isActive: true,
    $and: [
      {
        $or: [
          { effectiveFrom: { $exists: false } },
          { effectiveFrom: { $lte: now } },
        ],
      },
      {
        $or: [
          { effectiveTo: { $exists: false } },
          { effectiveTo: { $gte: now } },
        ],
      },
    ],
  })
    .sort({ effectiveFrom: -1 })
    .lean();

  if (!rate) {
    throw new ApiError(
      400,
      `No active rate is configured for material "${sub.name}". Please ask the admin to add a rate.`,
      "RATE_NOT_CONFIGURED"
    );
  }

  if (rate.maxRate < rate.minRate) {
    throw new ApiError(
      400,
      `The configured rate range for material "${sub.name}" is invalid. Please ask the admin to fix it.`,
      "INVALID_RATE_RANGE"
    );
  }

  return {
    subcategoryId: sub._id.toString(),
    itemName: sub.name,
    minRate: rate.minRate,
    maxRate: rate.maxRate,
    unit: rate.unit,
  };
}

export async function getActiveRatesForCategory(
  categoryId: string | mongoose.Types.ObjectId
): Promise<RateLookupResult[]> {
  await connectDB();

  const categoryObjectId =
    typeof categoryId === "string"
      ? new mongoose.Types.ObjectId(categoryId)
      : categoryId;

  const now = new Date();

  const rates = await ScrapRate.find({
    category: categoryObjectId,
    isActive: true,
    $and: [
      {
        $or: [
          { effectiveFrom: { $exists: false } },
          { effectiveFrom: { $lte: now } },
        ],
      },
      {
        $or: [
          { effectiveTo: { $exists: false } },
          { effectiveTo: { $gte: now } },
        ],
      },
    ],
  })
    .sort({ itemName: 1 })
    .lean();

  return rates.map((r) => ({
    rate: r.minRate,
    unit: r.unit,
    itemName: r.itemName,
  }));
}

export interface AdminRateDTO {
  id: string;
  subcategoryId: string;
  name: string;
  category: string;
  minRate: number;
  maxRate: number;
  unit: "kg" | "piece" | "unit";
  status: "active" | "inactive";
  updatedAt?: string;
}

export interface PublicRateDTO {
  id: string;
  subcategoryId: string;
  name: string;
  category: string;
  description: string;
  imageUrl?: string;
  minRate: number;
  maxRate: number;
  unit: "kg" | "piece" | "unit";
  isActive: boolean;
}

function effectiveWindowFilter() {
  const now = new Date();
  return {
    $and: [
      {
        $or: [
          { effectiveFrom: { $exists: false } },
          { effectiveFrom: { $lte: now } },
        ],
      },
      {
        $or: [
          { effectiveTo: { $exists: false } },
          { effectiveTo: { $gte: now } },
        ],
      },
    ],
  };
}

/** Admin: every rate joined with its subcategory and parent category names. */
export async function listAdminRates(): Promise<AdminRateDTO[]> {
  await connectDB();

  const [rates, subs, categories] = await Promise.all([
    ScrapRate.find({}).sort({ updatedAt: -1 }).lean(),
    ScrapCategory.find({ parent: { $ne: null } }).lean(),
    ScrapCategory.find({ parent: null }).lean(),
  ]);

  const subById = new Map(subs.map((s) => [s._id.toString(), s] as const));
  const catById = new Map(
    categories.map((c) => [c._id.toString(), c] as const)
  );

  return rates
    .map((rate) => {
      const sub = subById.get(rate.category.toString());
      const parent = sub?.parent ? catById.get(sub.parent.toString()) : undefined;

      return {
        id: rate._id.toString(),
        subcategoryId: rate.category.toString(),
        name: rate.itemName,
        category: parent?.name ?? "Unknown category",
        minRate: rate.minRate,
        maxRate: rate.maxRate,
        unit: rate.unit,
        status: (rate.isActive ? "active" : "inactive") as
          | "active"
          | "inactive",
        updatedAt: rate.updatedAt
          ? new Date(rate.updatedAt).toISOString()
          : undefined,
      };
    })
    .filter((r) => r.subcategoryId);
}

/** Public: active rates for active subcategories of active categories. */
export async function listPublicRates(): Promise<PublicRateDTO[]> {
  await connectDB();

  const rates = await ScrapRate.find({ isActive: true, ...effectiveWindowFilter() })
    .lean();

  if (rates.length === 0) {
    return [];
  }

  const subIds = Array.from(
    new Set(rates.map((r) => r.category.toString()))
  );

  const subs = await ScrapCategory.find({
    _id: { $in: subIds },
    parent: { $ne: null },
    isActive: true,
  }).lean();

  const subById = new Map(subs.map((s) => [s._id.toString(), s] as const));
  const parentIds = Array.from(
    new Set(
      subs
        .map((s) => (s.parent ? s.parent.toString() : null))
        .filter((v): v is string => Boolean(v))
    )
  );

  const parents = await ScrapCategory.find({
    _id: { $in: parentIds },
    parent: null,
    isActive: true,
  }).lean();
  const parentById = new Map(
    parents.map((p) => [p._id.toString(), p] as const)
  );

  return rates
    .map((rate): PublicRateDTO | null => {
      const sub = subById.get(rate.category.toString());
      if (!sub || !sub.parent) return null;
      const parent = parentById.get(sub.parent.toString());
      if (!parent) return null;

      return {
        id: rate._id.toString(),
        subcategoryId: sub._id.toString(),
        name: sub.name,
        category: parent.name,
        description: sub.description,
        imageUrl: sub.imageUrl,
        minRate: rate.minRate,
        maxRate: rate.maxRate,
        unit: rate.unit,
        isActive: rate.isActive && sub.isActive && parent.isActive,
      };
    })
    .filter((r): r is PublicRateDTO => r !== null);
}

async function loadValidSubcategory(
  categoryId: string
): Promise<{ id: mongoose.Types.ObjectId; name: string }> {
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new ApiError(400, "Please select a subcategory", "INVALID_CATEGORY");
  }

  const sub = await ScrapCategory.findOne({
    _id: categoryId,
    parent: { $ne: null },
  })
    .select("_id name")
    .lean();

  if (!sub) {
    throw new ApiError(
      400,
      "Please select a valid subcategory",
      "INVALID_CATEGORY"
    );
  }

  return { id: sub._id, name: sub.name };
}

async function assertNoActiveRateConflict(
  categoryId: mongoose.Types.ObjectId,
  itemName: string,
  excludeId?: string
): Promise<void> {
  const query: Record<string, unknown> = {
    category: categoryId,
    isActive: true,
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const existing = await ScrapRate.findOne(query)
    .select("_id")
    .lean();

  if (existing) {
    throw new ApiError(
      400,
      `An active rate already exists for "${itemName}". Edit the existing rate instead.`,
      "ACTIVE_RATE_EXISTS"
    );
  }
}

async function uniqueRateSlug(itemName: string): Promise<string> {
  const base = slugify(itemName) || "rate";
  let candidate = base;
  let suffix = 1;

  for (;;) {
    const existing = await ScrapRate.findOne({ slug: candidate })
      .select("_id")
      .lean();
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

export async function createRate(input: CreateRateInput): Promise<AdminRateDTO> {
  await connectDB();

  const sub = await loadValidSubcategory(input.category);
  const wantsActive = input.isActive ?? true;

  if (wantsActive) {
    await assertNoActiveRateConflict(sub.id, sub.name);
  }

  const doc = await ScrapRate.create({
    category: sub.id,
    itemName: sub.name,
    slug: await uniqueRateSlug(sub.name),
    minRate: input.minRate,
    maxRate: input.maxRate,
    unit: input.unit,
    isActive: wantsActive,
  });

  const parent = await ScrapCategory.findOne({
    _id: sub.id,
    parent: { $ne: null },
  })
    .select("parent")
    .lean();
  const parentDoc = parent?.parent
    ? await ScrapCategory.findById(parent.parent).select("name").lean()
    : null;

  return {
    id: doc._id.toString(),
    subcategoryId: sub.id.toString(),
    name: sub.name,
    category: parentDoc?.name ?? "Unknown category",
    minRate: doc.minRate,
    maxRate: doc.maxRate,
    unit: doc.unit,
    status: doc.isActive ? "active" : "inactive",
    updatedAt: doc.updatedAt
      ? new Date(doc.updatedAt).toISOString()
      : undefined,
  };
}

export async function updateRate(
  id: string,
  input: UpdateRateInput
): Promise<AdminRateDTO> {
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, "Rate not found", "NOT_FOUND");
  }

  const existing = await ScrapRate.findById(id).lean();
  if (!existing) {
    throw new ApiError(404, "Rate not found", "NOT_FOUND");
  }

  let subcategoryId = existing.category;
  let itemName = existing.itemName;

  if (input.category !== undefined && input.category !== existing.category.toString()) {
    const sub = await loadValidSubcategory(input.category);
    subcategoryId = sub.id;
    itemName = sub.name;
  }

  const finalMin = input.minRate ?? existing.minRate;
  const finalMax = input.maxRate ?? existing.maxRate;
  if (finalMax < finalMin) {
    throw new ApiError(
      400,
      "Maximum rate must be greater than or equal to minimum rate",
      "INVALID_RATE_RANGE"
    );
  }

  const finalActive = input.isActive ?? existing.isActive;
  if (finalActive) {
    await assertNoActiveRateConflict(
      subcategoryId,
      itemName,
      existing._id.toString()
    );
  }

  const updates: Record<string, unknown> = {};
  if (input.category !== undefined) {
    updates.category = subcategoryId;
    updates.itemName = itemName;
    updates.slug = await uniqueRateSlug(itemName);
  }
  if (input.minRate !== undefined) updates.minRate = input.minRate;
  if (input.maxRate !== undefined) updates.maxRate = input.maxRate;
  if (input.unit !== undefined) updates.unit = input.unit;
  if (input.isActive !== undefined) updates.isActive = input.isActive;

  const doc = await ScrapRate.findByIdAndUpdate(existing._id, updates, {
    new: true,
    runValidators: true,
  }).lean();

  if (!doc) {
    throw new ApiError(404, "Rate not found", "NOT_FOUND");
  }

  const sub = await ScrapCategory.findById(doc.category)
    .select("parent name")
    .lean();
  const parentDoc = sub?.parent
    ? await ScrapCategory.findById(sub.parent).select("name").lean()
    : null;

  return {
    id: doc._id.toString(),
    subcategoryId: doc.category.toString(),
    name: doc.itemName,
    category: parentDoc?.name ?? "Unknown category",
    minRate: doc.minRate,
    maxRate: doc.maxRate,
    unit: doc.unit,
    status: doc.isActive ? "active" : "inactive",
    updatedAt: doc.updatedAt
      ? new Date(doc.updatedAt).toISOString()
      : undefined,
  };
}

export async function deleteRate(id: string): Promise<void> {
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, "Rate not found", "NOT_FOUND");
  }

  const existing = await ScrapRate.findById(id).select("_id").lean();
  if (!existing) {
    throw new ApiError(404, "Rate not found", "NOT_FOUND");
  }

  await ScrapRate.deleteOne({ _id: existing._id });
}

const rateService = {
  getActiveRateForMaterial,
  getActiveRateBySubcategory,
  getActiveRatesForCategory,
  listAdminRates,
  listPublicRates,
  createRate,
  updateRate,
  deleteRate,
};

export default rateService;