import mongoose from "mongoose";
import ScrapCategory from "@/models/ScrapCategory";
import ScrapRate from "@/models/ScrapRate";
import Pickup from "@/models/Pickup";
import connectDB from "@/lib/db/mongoose";
import { ApiError } from "@/lib/utils/api-error";
import { slugify } from "@/lib/utils/slug";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateSubcategoryInput,
  UpdateSubcategoryInput,
} from "@/lib/validations/category";

export interface SubcategoryDTO {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  cloudinaryPublicId?: string;
  status: "active" | "inactive";
  updatedAt?: string;
}

export interface PublicSubcategoryDTO {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
}

export interface CategoryDTO {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  subcategoryCount: number;
  updatedAt?: string;
}

export interface AdminCategoryDTO extends CategoryDTO {
  subcategories: SubcategoryDTO[];
}

export interface PublicCategoryDTO {
  id: string;
  name: string;
  description: string;
  subcategoryCount: number;
}

type LeanCategory = {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  parent?: mongoose.Types.ObjectId | null;
  imageUrl?: string;
  cloudinaryPublicId?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

function statusOf(isActive: boolean): "active" | "inactive" {
  return isActive ? "active" : "inactive";
}

function serializeSub(doc: LeanCategory): SubcategoryDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    imageUrl: doc.imageUrl,
    cloudinaryPublicId: doc.cloudinaryPublicId,
    status: statusOf(doc.isActive),
    updatedAt: doc.updatedAt
      ? new Date(doc.updatedAt).toISOString()
      : undefined,
  };
}

async function uniqueSlugForName(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name) || "category";
  let candidate = base;
  let suffix = 1;

  for (;;) {
    const existing = await ScrapCategory.findOne({ slug: candidate })
      .select("_id")
      .lean();
    if (!existing || existing._id.toString() === excludeId) {
      return candidate;
    }
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

async function assertNameAvailable(name: string, excludeId?: string): Promise<void> {
  const existing = await ScrapCategory.findOne({ name })
    .select("_id")
    .lean();

  if (existing && existing._id.toString() !== excludeId) {
    throw new ApiError(
      400,
      `A scrap item or category named "${name}" already exists`,
      "DUPLICATE_NAME"
    );
  }
}

async function loadTopLevel(id: string): Promise<LeanCategory> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, "Category not found", "NOT_FOUND");
  }

  const doc = await ScrapCategory.findOne({ _id: id, parent: null }).lean();
  if (!doc) {
    throw new ApiError(404, "Category not found", "NOT_FOUND");
  }
  return doc as LeanCategory;
}

async function loadSubcategory(id: string): Promise<LeanCategory> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, "Subcategory not found", "NOT_FOUND");
  }

  const doc = await ScrapCategory.findOne({
    _id: id,
    parent: { $ne: null },
  }).lean();
  if (!doc) {
    throw new ApiError(404, "Subcategory not found", "NOT_FOUND");
  }
  return doc as LeanCategory;
}

/** Public: active top-level categories with active subcategory counts. */
export async function listPublicCategories(): Promise<PublicCategoryDTO[]> {
  await connectDB();

  const categories = await ScrapCategory.find({ parent: null, isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  const counts = await ScrapCategory.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    { $match: { parent: { $ne: null }, isActive: true } },
    { $group: { _id: "$parent", count: { $sum: 1 } } },
  ]);

  const countByParent = new Map(
    counts.map((c) => [c._id.toString(), c.count] as const)
  );

  return categories.map((cat) => ({
    id: cat._id.toString(),
    name: cat.name,
    description: cat.description,
    subcategoryCount: countByParent.get(cat._id.toString()) ?? 0,
  }));
}

/** Public: active subcategories of one active top-level category. */
export async function listPublicSubcategories(
  categoryId: string
): Promise<PublicSubcategoryDTO[]> {
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new ApiError(404, "Category not found", "NOT_FOUND");
  }

  const parent = await ScrapCategory.findOne({
    _id: categoryId,
    parent: null,
    isActive: true,
  })
    .select("_id")
    .lean();

  if (!parent) {
    throw new ApiError(404, "Category not found", "NOT_FOUND");
  }

  const subs = await ScrapCategory.find({
    parent: categoryId,
    isActive: true,
  })
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  return subs.map((sub) => ({
    id: sub._id.toString(),
    name: sub.name,
    description: sub.description,
    imageUrl: sub.imageUrl,
  }));
}

/** Admin: all top-level categories (any status) with their subcategories. */
export async function listAdminCategories(): Promise<AdminCategoryDTO[]> {
  await connectDB();

  const [categories, subs] = await Promise.all([
    ScrapCategory.find({ parent: null })
      .sort({ sortOrder: 1, name: 1 })
      .lean(),
    ScrapCategory.find({ parent: { $ne: null } })
      .sort({ sortOrder: 1, name: 1 })
      .lean(),
  ]);

  const subsByParent = new Map<string, LeanCategory[]>();
  for (const sub of subs) {
    const key = sub.parent ? sub.parent.toString() : "";
    const list = subsByParent.get(key) ?? [];
    list.push(sub as unknown as LeanCategory);
    subsByParent.set(key, list);
  }

  return categories.map((cat) => {
    const children = subsByParent.get(cat._id.toString()) ?? [];
    return {
      id: cat._id.toString(),
      name: cat.name,
      description: cat.description,
      status: statusOf(cat.isActive),
      subcategoryCount: children.length,
      updatedAt: cat.updatedAt
        ? new Date(cat.updatedAt).toISOString()
        : undefined,
      subcategories: children.map(serializeSub),
    };
  });
}

export async function createCategory(
  input: CreateCategoryInput
): Promise<CategoryDTO> {
  await connectDB();

  await assertNameAvailable(input.name);
  const slug = await uniqueSlugForName(input.name);

  const doc = await ScrapCategory.create({
    name: input.name,
    slug,
    description: input.description ?? "",
    parent: null,
    isActive: input.isActive ?? true,
  });

  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    status: statusOf(doc.isActive),
    subcategoryCount: 0,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
  };
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput
): Promise<CategoryDTO> {
  await connectDB();

  const existing = await loadTopLevel(id);
  if (input.name !== undefined) {
    await assertNameAvailable(input.name, existing._id.toString());
  }

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) {
    updates.name = input.name;
    updates.slug = await uniqueSlugForName(
      input.name,
      existing._id.toString()
    );
  }
  if (input.description !== undefined) updates.description = input.description;
  if (input.isActive !== undefined) updates.isActive = input.isActive;

  const doc = await ScrapCategory.findByIdAndUpdate(existing._id, updates, {
    new: true,
    runValidators: true,
  }).lean();

  if (!doc) {
    throw new ApiError(404, "Category not found", "NOT_FOUND");
  }

  const subCount = await ScrapCategory.countDocuments({ parent: existing._id });
  const updated = doc as unknown as LeanCategory;

  return {
    id: updated._id.toString(),
    name: updated.name,
    description: updated.description,
    status: statusOf(updated.isActive),
    subcategoryCount: subCount,
    updatedAt: updated.updatedAt
      ? new Date(updated.updatedAt).toISOString()
      : undefined,
  };
}

export async function deleteCategory(id: string): Promise<void> {
  await connectDB();

  const existing = await loadTopLevel(id);
  const subCount = await ScrapCategory.countDocuments({ parent: existing._id });

  if (subCount > 0) {
    throw new ApiError(
      400,
      `Cannot delete "${existing.name}" because it has ${subCount} subcategor${
        subCount === 1 ? "y" : "ies"
      }. Deactivate it instead.`,
      "HAS_SUBCATEGORIES"
    );
  }

  await ScrapCategory.deleteOne({ _id: existing._id });
}

export async function createSubcategory(
  categoryId: string,
  input: CreateSubcategoryInput
): Promise<SubcategoryDTO> {
  await connectDB();

  const parent = await loadTopLevel(categoryId);
  if (!parent.isActive) {
    throw new ApiError(
      400,
      `Category "${parent.name}" is inactive. Activate it before adding subcategories.`,
      "INACTIVE_PARENT"
    );
  }

  await assertNameAvailable(input.name);
  const slug = await uniqueSlugForName(input.name);

  const doc = await ScrapCategory.create({
    name: input.name,
    slug,
    description: input.description,
    parent: parent._id,
    imageUrl: input.imageUrl,
    cloudinaryPublicId: input.cloudinaryPublicId,
    isActive: input.isActive ?? true,
  });

  return serializeSub(doc.toObject() as unknown as LeanCategory);
}

export interface UpdateSubcategoryResult {
  subcategory: SubcategoryDTO;
  previousImagePublicId?: string;
  imageChanged: boolean;
}

export async function updateSubcategory(
  id: string,
  input: UpdateSubcategoryInput
): Promise<UpdateSubcategoryResult> {
  await connectDB();

  const existing = await loadSubcategory(id);
  if (input.name !== undefined) {
    await assertNameAvailable(input.name, existing._id.toString());
  }

  const previousPublicId = existing.cloudinaryPublicId;
  const imageChanged =
    input.imageUrl !== undefined && input.imageUrl !== existing.imageUrl;

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) {
    updates.name = input.name;
    updates.slug = await uniqueSlugForName(input.name, existing._id.toString());
  }
  if (input.description !== undefined) updates.description = input.description;
  if (input.imageUrl !== undefined) updates.imageUrl = input.imageUrl;
  if (input.cloudinaryPublicId !== undefined) {
    updates.cloudinaryPublicId = input.cloudinaryPublicId;
  }
  if (input.isActive !== undefined) updates.isActive = input.isActive;

  const doc = await ScrapCategory.findByIdAndUpdate(existing._id, updates, {
    new: true,
    runValidators: true,
  }).lean();

  if (!doc) {
    throw new ApiError(404, "Subcategory not found", "NOT_FOUND");
  }

  return {
    subcategory: serializeSub(doc as unknown as LeanCategory),
    previousImagePublicId: imageChanged ? previousPublicId : undefined,
    imageChanged,
  };
}

export interface DeleteSubcategoryResult {
  imagePublicId?: string;
}

export async function deleteSubcategory(
  id: string
): Promise<DeleteSubcategoryResult> {
  await connectDB();

  const existing = await loadSubcategory(id);

  const [rateCount, pickupCount] = await Promise.all([
    ScrapRate.countDocuments({ category: existing._id }),
    Pickup.countDocuments({ "items.category": existing._id }),
  ]);

  if (rateCount > 0 || pickupCount > 0) {
    throw new ApiError(
      400,
      `Cannot permanently delete "${existing.name}" because it is being used by ${
        rateCount + pickupCount
      } record(s). Deactivate it instead.`,
      "HAS_REFERENCES"
    );
  }

  await ScrapCategory.deleteOne({ _id: existing._id });

  return { imagePublicId: existing.cloudinaryPublicId };
}

/**
 * Strict validation used when booking a pickup: the id must point to an
 * active subcategory whose parent category is also active. Never creates
 * missing categories.
 */
export async function resolvePickupSubcategory(
  frontendId: string,
  categoryName: string
): Promise<{ id: mongoose.Types.ObjectId; name: string }> {
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(frontendId)) {
    throw new ApiError(
      400,
      `"${categoryName}" is not a valid scrap category`,
      "INVALID_CATEGORY"
    );
  }

  const sub = await ScrapCategory.findOne({
    _id: frontendId,
    parent: { $ne: null },
    isActive: true,
  })
    .select("_id name parent")
    .lean();

  if (!sub || !sub.parent) {
    throw new ApiError(
      400,
      `"${categoryName}" is not a valid scrap category`,
      "INVALID_CATEGORY"
    );
  }

  const parent = await ScrapCategory.findOne({
    _id: sub.parent,
    parent: null,
    isActive: true,
  })
    .select("_id")
    .lean();

  if (!parent) {
    throw new ApiError(
      400,
      `"${categoryName}" is currently unavailable`,
      "INACTIVE_CATEGORY"
    );
  }

  return { id: sub._id, name: sub.name };
}

const categoryService = {
  listPublicCategories,
  listPublicSubcategories,
  listAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  resolvePickupSubcategory,
};

export default categoryService;
