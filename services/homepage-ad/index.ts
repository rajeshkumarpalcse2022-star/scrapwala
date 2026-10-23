import mongoose from "mongoose";
import connectDB from "@/lib/db/mongoose";
import { ApiError } from "@/lib/utils/api-error";
import HomepageAd, { type IHomepageAd } from "@/models/HomepageAd";
import type {
  CreateHomepageAdInput,
  UpdateHomepageAdInput,
} from "@/lib/validations/homepage-ad";

export interface HomepageAdDTO {
  id: string;
  title: string;
  image: { url: string; publicId?: string; alt: string };
  linkUrl: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveHomepageAdDTO {
  title: string;
  imageUrl: string;
  imageAlt: string;
  linkUrl: string | null;
}

function serialize(doc: IHomepageAd): HomepageAdDTO {
  return {
    id: String(doc._id),
    title: doc.title,
    image: {
      url: doc.image.url,
      publicId: doc.image.publicId,
      alt: doc.image.alt || "",
    },
    linkUrl: doc.linkUrl || null,
    isActive: doc.isActive,
    startsAt: doc.startsAt ? new Date(doc.startsAt).toISOString() : null,
    endsAt: doc.endsAt ? new Date(doc.endsAt).toISOString() : null,
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, "Please provide a valid date", "INVALID_DATE");
  }
  return parsed;
}

/** Single active ad at a time — mirrors the blog featured-post rule. */
async function deactivateOthers(excludeId?: string): Promise<void> {
  const filter: Record<string, unknown> = { isActive: true };
  if (excludeId) filter._id = { $ne: excludeId };
  await HomepageAd.updateMany(filter, { $set: { isActive: false } });
}

/**
 * The ad currently shown on the homepage: active, inside its optional
 * schedule window, most recently updated wins.
 */
export async function getActiveHomepageAd(): Promise<ActiveHomepageAdDTO | null> {
  await connectDB();

  const now = new Date();
  const doc = await HomepageAd.findOne({
    isActive: true,
    $and: [
      {
        $or: [
          { startsAt: null },
          { startsAt: { $exists: false } },
          { startsAt: { $lte: now } },
        ],
      },
      {
        $or: [
          { endsAt: null },
          { endsAt: { $exists: false } },
          { endsAt: { $gte: now } },
        ],
      },
    ],
  })
    .sort({ updatedAt: -1 })
    .select("title image linkUrl")
    .lean();

  if (!doc) return null;

  return {
    title: doc.title,
    imageUrl: doc.image.url,
    imageAlt: doc.image.alt || doc.title,
    linkUrl: doc.linkUrl || null,
  };
}

export async function listHomepageAds(): Promise<HomepageAdDTO[]> {
  await connectDB();
  const docs = await HomepageAd.find({}).sort({ updatedAt: -1 }).lean();
  return docs.map((doc) => serialize(doc as unknown as IHomepageAd));
}

async function loadAd(id: string): Promise<IHomepageAd> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, "Homepage ad not found", "NOT_FOUND");
  }
  const doc = await HomepageAd.findById(id);
  if (!doc) {
    throw new ApiError(404, "Homepage ad not found", "NOT_FOUND");
  }
  return doc;
}

export async function createHomepageAd(
  input: CreateHomepageAdInput,
  adminId?: string
): Promise<HomepageAdDTO> {
  await connectDB();

  if (input.isActive) await deactivateOthers();

  const doc = await HomepageAd.create({
    title: input.title,
    image: {
      url: input.image.url,
      publicId: input.image.publicId,
      alt: input.image.alt || input.title,
    },
    linkUrl: input.linkUrl?.trim() || null,
    isActive: input.isActive,
    startsAt: parseDate(input.startsAt),
    endsAt: parseDate(input.endsAt),
    createdBy:
      adminId && mongoose.Types.ObjectId.isValid(adminId) ? adminId : null,
  });

  return serialize(doc);
}

export async function updateHomepageAd(
  id: string,
  input: UpdateHomepageAdInput
): Promise<HomepageAdDTO> {
  await connectDB();
  const doc = await loadAd(id);

  if (input.isActive === true) await deactivateOthers(id);

  if (input.title !== undefined) doc.title = input.title;
  if (input.image) {
    doc.image = {
      url: input.image.url,
      publicId: input.image.publicId,
      alt: input.image.alt || doc.title,
    };
  }
  if (input.linkUrl !== undefined) doc.linkUrl = input.linkUrl?.trim() || null;
  if (input.isActive !== undefined) doc.isActive = input.isActive;
  if (input.startsAt !== undefined) doc.startsAt = parseDate(input.startsAt);
  if (input.endsAt !== undefined) doc.endsAt = parseDate(input.endsAt);

  await doc.save();
  return serialize(doc);
}

export async function deleteHomepageAd(id: string): Promise<void> {
  await connectDB();
  const doc = await loadAd(id);
  await doc.deleteOne();
}
