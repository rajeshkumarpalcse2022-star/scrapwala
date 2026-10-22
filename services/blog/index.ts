import mongoose from "mongoose";
import connectDB from "@/lib/db/mongoose";
import { ApiError } from "@/lib/utils/api-error";
import { slugify } from "@/lib/utils/slug";
import BlogPost, {
  type BlogImageMeta,
  type BlogPostStatus,
  type IBlogPost,
} from "@/models/BlogPost";
import BlogCategory from "@/models/BlogCategory";
import {
  calculateReadingTimeMinutes,
  extractPlainText,
  isEmptyContent,
  type BlogBlock,
} from "@/lib/utils/blog-content";
import { destroyAsset } from "@/services/cloudinary";
import type {
  CreateBlogCategoryInput,
  CreateBlogInput,
  UpdateBlogCategoryInput,
  UpdateBlogInput,
} from "@/lib/validations/blog";

/* ── Types ─────────────────────────────────────────────────────────────── */

export interface BlogCategoryRefDTO {
  id: string;
  name: string;
  slug: string;
}

export interface BlogCategoryDTO extends BlogCategoryRefDTO {
  description: string;
  isActive: boolean;
  sortOrder: number;
  postCount: number;
  updatedAt?: string;
}

export interface BlogImageDTO {
  url: string;
  publicId?: string;
  alt: string;
}

export interface PublicBlogCardDTO {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  subtitle?: string;
  category: BlogCategoryRefDTO | null;
  coverImage: BlogImageDTO | null;
  authorName?: string;
  publishedAt: string;
  readingTimeMinutes: number;
  isFeatured: boolean;
}

export interface PublicBlogDetailDTO extends PublicBlogCardDTO {
  content: BlogBlock[];
  socialImage: BlogImageDTO | null;
  seoMetaTitle?: string;
  seoMetaDescription?: string;
  updatedAt?: string;
}

export interface AdminBlogListItemDTO {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: BlogCategoryRefDTO | null;
  authorName: string;
  status: BlogPostStatus;
  isFeatured: boolean;
  readingTimeMinutes: number;
  coverImage: BlogImageDTO | null;
  publishedAt?: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBlogDetailDTO extends AdminBlogListItemDTO {
  subtitle?: string;
  content: BlogBlock[];
  socialImage: BlogImageDTO | null;
  seoMetaTitle?: string;
  seoMetaDescription?: string;
}

export interface PublicBlogListParams {
  page?: number;
  limit?: number;
  category?: string;
  q?: string;
}

export interface PublicBlogListResult {
  posts: PublicBlogCardDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  category: BlogCategoryRefDTO | null;
}

export interface AdminBlogListParams {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  status?: string;
}

export interface AdminBlogListResult {
  posts: AdminBlogListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface PostDoc {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  excerpt: string;
  subtitle?: string;
  content: BlogBlock[];
  searchText?: string;
  category: mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId; name: string; slug: string };
  authorName: string;
  createdBy?: mongoose.Types.ObjectId | null;
  coverImage?: BlogImageMeta | null;
  socialImage?: BlogImageMeta | null;
  status: BlogPostStatus;
  isFeatured: boolean;
  publishedAt?: Date | null;
  scheduledAt?: Date | null;
  readingTimeMinutes: number;
  seoMetaTitle?: string;
  seoMetaDescription?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Mongoose's filter type is not exported publicly, but `sanitizeFilter` is a
 * single-signature function whose parameter *is* `QueryFilter<IBlogPost>`.
 */
type BlogFilter = Parameters<typeof mongoose.sanitizeFilter<IBlogPost>>[0];

const VALID_STATUSES: BlogPostStatus[] = [
  "draft",
  "scheduled",
  "published",
  "archived",
];

const MAX_PAGE_SIZE = 24;
const DEFAULT_PAGE_SIZE = 9;
const SCHEDULE_PROMOTION_BATCH = 1000;

function toIso(value: Date | string | number | null | undefined): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clampPage(page: number | undefined): number {
  if (!page || Number.isNaN(page) || page < 1) return 1;
  return Math.floor(page);
}

function clampPageSize(limit: number | undefined): number {
  if (!limit || Number.isNaN(limit) || limit < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(limit, MAX_PAGE_SIZE);
}

function asPostDoc(doc: unknown): PostDoc {
  return doc as PostDoc;
}

function serializeImage(
  image: BlogImageMeta | null | undefined
): BlogImageDTO | null {
  if (!image || !image.url) return null;
  return { url: image.url, publicId: image.publicId, alt: image.alt || "" };
}

/* ── Eligibility + scheduled promotion ─────────────────────────────────── */

/**
 * Publicly eligible = published with a publication timestamp in the past.
 * The `scheduled && due` branch is a safety net for reads that happen before
 * a promotion pass; `promoteDueScheduledPosts()` normally flips them first.
 */
function eligibleFilter(): BlogFilter {
  const now = new Date();
  return {
    $or: [
      { status: "published", publishedAt: { $lte: now } },
      { status: "scheduled", scheduledAt: { $lte: now } },
    ],
  };
}

/**
 * Flip scheduled articles whose real publication time has passed.
 * Runs cheaply against the `{ status, scheduledAt }` index and writes only
 * when something is actually due, so public reads stay inexpensive.
 */
export async function promoteDueScheduledPosts(): Promise<number> {
  await connectDB();

  try {
    const due = await BlogPost.find({
      status: "scheduled",
      scheduledAt: { $lte: new Date() },
    })
      .select("_id scheduledAt")
      .limit(SCHEDULE_PROMOTION_BATCH)
      .lean();

    if (due.length === 0) return 0;

    const now = new Date();
    await BlogPost.bulkWrite(
      due.map((doc) => ({
        updateOne: {
          filter: { _id: doc._id, status: "scheduled" },
          update: {
            $set: {
              status: "published",
              publishedAt: doc.scheduledAt ?? now,
              updatedAt: now,
            },
          },
        },
      }))
    );
    return due.length;
  } catch {
    return 0;
  }
}

/* ── Shared lookups ────────────────────────────────────────────────────── */

async function categoryRefMap(
  ids: (mongoose.Types.ObjectId | string)[]
): Promise<Map<string, BlogCategoryRefDTO>> {
  const unique = [...new Set(ids.map((id) => String(id)))].filter(Boolean);
  if (unique.length === 0) return new Map();

  const docs = await BlogCategory.find({ _id: { $in: unique } })
    .select("name slug")
    .lean();

  return new Map(
    docs.map((doc) => [
      String(doc._id),
      { id: String(doc._id), name: doc.name, slug: doc.slug },
    ])
  );
}

async function resolveCategory(
  id: string,
  options: { requireActive?: boolean } = {}
): Promise<{ id: mongoose.Types.ObjectId; name: string; slug: string; isActive: boolean }> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Please choose a valid blog category", "INVALID_CATEGORY");
  }

  const category = await BlogCategory.findById(id)
    .select("_id name slug isActive")
    .lean();

  if (!category) {
    throw new ApiError(400, "The selected category no longer exists", "CATEGORY_NOT_FOUND");
  }
  if (options.requireActive && !category.isActive) {
    throw new ApiError(
      400,
      `"${category.name}" is archived. Restore it before using it for a new article.`,
      "CATEGORY_ARCHIVED"
    );
  }

  return {
    id: category._id as mongoose.Types.ObjectId,
    name: category.name,
    slug: category.slug,
    isActive: category.isActive,
  };
}

async function uniquePostSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "article";
  let candidate = root;
  let suffix = 1;

  for (;;) {
    const existing = await BlogPost.findOne({ slug: candidate })
      .select("_id")
      .lean();
    if (!existing || String(existing._id) === excludeId) return candidate;
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }
}

async function assertSlugAvailable(slug: string, excludeId?: string): Promise<void> {
  const existing = await BlogPost.findOne({ slug }).select("_id").lean();
  if (existing && String(existing._id) !== excludeId) {
    throw new ApiError(
      400,
      `Another article already uses the slug "${slug}"`,
      "DUPLICATE_SLUG"
    );
  }
}

function buildSearchText(values: {
  title: string;
  excerpt: string;
  subtitle?: string;
  content: unknown;
}): string {
  return [
    values.title,
    values.excerpt,
    values.subtitle ?? "",
    extractPlainText(values.content),
  ]
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function assertPublishable(blocks: BlogBlock[]): void {
  if (isEmptyContent(blocks)) {
    throw new ApiError(
      400,
      "Add some article content before publishing",
      "EMPTY_CONTENT"
    );
  }
}

function normalizeSchedule(
  status: BlogPostStatus | undefined,
  scheduledAt?: string | null,
  options: { allowPast?: boolean } = {}
): {
  status: BlogPostStatus;
  scheduledAt: Date | null;
} {
  const nextStatus: BlogPostStatus = status ?? "draft";

  if (nextStatus === "scheduled") {
    if (!scheduledAt) {
      throw new ApiError(
        400,
        "Choose a publication time when scheduling an article",
        "SCHEDULE_TIME_REQUIRED"
      );
    }
    const parsed = new Date(scheduledAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new ApiError(400, "Schedule time is not a valid date", "INVALID_SCHEDULE_TIME");
    }
    if (parsed.getTime() <= Date.now() && !options.allowPast) {
      throw new ApiError(
        400,
        "Schedule time must be in the future",
        "SCHEDULE_TIME_PAST"
      );
    }
    return { status: "scheduled", scheduledAt: parsed };
  }

  return { status: nextStatus, scheduledAt: null };
}

async function unfeatureOthers(excludeId?: string): Promise<void> {
  const filter: BlogFilter = { isFeatured: true };
  if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
    filter._id = { $ne: excludeId };
  }
  await BlogPost.updateMany(filter, { $set: { isFeatured: false } });
}

function collectPublicIds(post: {
  coverImage?: BlogImageMeta | null;
  socialImage?: BlogImageMeta | null;
  content?: unknown;
}): string[] {
  const ids: string[] = [];
  if (post.coverImage?.publicId) ids.push(post.coverImage.publicId);
  if (post.socialImage?.publicId) ids.push(post.socialImage.publicId);

  if (Array.isArray(post.content)) {
    for (const block of post.content) {
      const candidate = block as { type?: string; publicId?: string };
      if (candidate?.type === "image" && candidate.publicId) {
        ids.push(candidate.publicId);
      }
    }
  }

  return ids;
}

/**
 * Destroy Cloudinary assets that are no longer referenced by any blog post.
 * Best effort only — an image API hiccup must never fail a save/delete.
 */
async function cleanupUnusedImages(
  publicIds: string[],
  excludePostId?: string
): Promise<void> {
  const unique = [...new Set(publicIds.filter(Boolean))];

  for (const publicId of unique) {
    try {
      const filter: BlogFilter = {
        $or: [
          { "coverImage.publicId": publicId },
          { "socialImage.publicId": publicId },
          { "content.publicId": publicId },
        ],
      };
      if (excludePostId && mongoose.Types.ObjectId.isValid(excludePostId)) {
        filter._id = { $ne: excludePostId };
      }

      const stillReferenced = await BlogPost.exists(filter);
      if (!stillReferenced) {
        await destroyAsset(publicId);
      }
    } catch {
      // Best effort: the asset is orphaned at worst.
    }
  }
}

/* ── Serializers ───────────────────────────────────────────────────────── */

/**
 * Category may be a bare ObjectId (normal queries) or a populated object.
 * When only the id is present we fall back to the pre-fetched ref map.
 */
function readCategoryRef(
  category: PostDoc["category"] | null | undefined,
  categories: Map<string, BlogCategoryRefDTO>
): BlogCategoryRefDTO | null {
  if (!category) return null;
  if (typeof category === "object" && "name" in category) {
    return { id: String(category._id), name: category.name, slug: category.slug };
  }
  return categories.get(String(category)) ?? null;
}

function serializePublicCard(
  doc: PostDoc,
  categories: Map<string, BlogCategoryRefDTO>
): PublicBlogCardDTO {
  return {
    id: String(doc._id),
    title: doc.title,
    slug: doc.slug,
    excerpt: doc.excerpt,
    subtitle: doc.subtitle,
    category: readCategoryRef(doc.category, categories),
    coverImage: serializeImage(doc.coverImage),
    authorName: doc.authorName,
    publishedAt: toIso(doc.publishedAt) ?? toIso(doc.createdAt) ?? new Date(0).toISOString(),
    readingTimeMinutes: doc.readingTimeMinutes || 1,
    isFeatured: !!doc.isFeatured,
  };
}

function serializeAdminItem(
  doc: PostDoc,
  categories: Map<string, BlogCategoryRefDTO>
): AdminBlogListItemDTO {
  return {
    id: String(doc._id),
    title: doc.title,
    slug: doc.slug,
    excerpt: doc.excerpt,
    category: readCategoryRef(doc.category, categories),
    authorName: doc.authorName,
    status: doc.status,
    isFeatured: !!doc.isFeatured,
    readingTimeMinutes: doc.readingTimeMinutes || 1,
    coverImage: serializeImage(doc.coverImage),
    publishedAt: toIso(doc.publishedAt),
    scheduledAt: toIso(doc.scheduledAt),
    createdAt: toIso(doc.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(doc.updatedAt) ?? new Date().toISOString(),
  };
}

function serializeAdminDetail(
  doc: PostDoc,
  categories: Map<string, BlogCategoryRefDTO>
): AdminBlogDetailDTO {
  return {
    ...serializeAdminItem(doc, categories),
    subtitle: doc.subtitle,
    content: Array.isArray(doc.content) ? doc.content : [],
    socialImage: serializeImage(doc.socialImage),
    seoMetaTitle: doc.seoMetaTitle,
    seoMetaDescription: doc.seoMetaDescription,
  };
}

function serializePublicDetail(
  doc: PostDoc,
  categories: Map<string, BlogCategoryRefDTO>
): PublicBlogDetailDTO {
  return {
    ...serializePublicCard(doc, categories),
    content: Array.isArray(doc.content) ? doc.content : [],
    socialImage: serializeImage(doc.socialImage),
    seoMetaTitle: doc.seoMetaTitle,
    seoMetaDescription: doc.seoMetaDescription,
    updatedAt: toIso(doc.updatedAt),
  };
}

/* ── Public services ───────────────────────────────────────────────────── */

export async function listPublishedPosts(
  params: PublicBlogListParams = {}
): Promise<PublicBlogListResult> {
  await connectDB();
  await promoteDueScheduledPosts();

  const page = clampPage(params.page);
  const pageSize = clampPageSize(params.limit);

  const conditions: BlogFilter[] = [eligibleFilter()];

  let selectedCategory: BlogCategoryRefDTO | null = null;
  if (params.category) {
    const category = await BlogCategory.findOne({
      slug: params.category,
      isActive: true,
    })
      .select("_id name slug")
      .lean();

    if (!category) {
      // Unknown or archived category: honest empty result, never a fallback.
      return {
        posts: [],
        total: 0,
        page: 1,
        pageSize,
        totalPages: 0,
        category: null,
      };
    }

    selectedCategory = {
      id: String(category._id),
      name: category.name,
      slug: category.slug,
    };
    conditions.push({ category: category._id });
  }

  const query = params.q
    ? {
        $and: [
          ...conditions,
          {
            $or: [
              { title: new RegExp(escapeRegex(params.q), "i") },
              { excerpt: new RegExp(escapeRegex(params.q), "i") },
              { searchText: new RegExp(escapeRegex(params.q), "i") },
            ],
          },
        ],
      }
    : { $and: conditions };

  const [total, docs] = await Promise.all([
    BlogPost.countDocuments(query),
    BlogPost.find(query)
      .sort({ publishedAt: -1, _id: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .select(
        "title slug excerpt subtitle category authorName coverImage publishedAt readingTimeMinutes isFeatured"
      )
      .lean(),
  ]);

  const categories = await categoryRefMap(
    (docs as unknown as PostDoc[]).map((doc) =>
      typeof doc.category === "object" && doc.category ? doc.category._id : doc.category
    )
  );

  return {
    posts: (docs as unknown as PostDoc[]).map((doc) =>
      serializePublicCard(doc, categories)
    ),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    category: selectedCategory,
  };
}

export async function getFeaturedPublishedPost(): Promise<PublicBlogCardDTO | null> {
  await connectDB();
  await promoteDueScheduledPosts();

  const doc = await BlogPost.findOne({
    $and: [eligibleFilter(), { isFeatured: true }],
  })
    .sort({ publishedAt: -1 })
    .select(
      "title slug excerpt subtitle category authorName coverImage publishedAt readingTimeMinutes isFeatured"
    )
    .lean();

  if (!doc) return null;

  const lean = asPostDoc(doc);
  const categories = await categoryRefMap([
    typeof lean.category === "object" && lean.category ? lean.category._id : lean.category,
  ]);
  return serializePublicCard(lean, categories);
}

export async function getPublishedPostBySlug(
  slug: string
): Promise<PublicBlogDetailDTO | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 220) {
    return null;
  }

  await connectDB();
  await promoteDueScheduledPosts();

  const doc = await BlogPost.findOne({ $and: [eligibleFilter(), { slug }] })
    .select("-__v")
    .lean();

  if (!doc) return null;

  const lean = asPostDoc(doc);
  const categories = await categoryRefMap([
    typeof lean.category === "object" && lean.category ? lean.category._id : lean.category,
  ]);
  return serializePublicDetail(lean, categories);
}

export async function getRelatedPublishedPosts(
  post: PublicBlogDetailDTO,
  limit = 3
): Promise<PublicBlogCardDTO[]> {
  if (!post.category) return [];

  await connectDB();

  const docs = await BlogPost.find({
    $and: [
      eligibleFilter(),
      { category: post.category.id },
      { _id: { $ne: post.id } },
    ],
  })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .select(
      "title slug excerpt subtitle category authorName coverImage publishedAt readingTimeMinutes isFeatured"
    )
    .lean();

  const categories = await categoryRefMap(
    (docs as unknown as PostDoc[]).map((doc) =>
      typeof doc.category === "object" && doc.category ? doc.category._id : doc.category
    )
  );

  return (docs as unknown as PostDoc[]).map((doc) =>
    serializePublicCard(doc, categories)
  );
}

/** Active blog categories with their published-article counts (public nav). */
export async function listPublicBlogCategories(): Promise<
  (BlogCategoryRefDTO & { postCount: number })[]
> {
  await connectDB();

  const [categories, counts] = await Promise.all([
    BlogCategory.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .select("name slug")
      .lean(),
    BlogPost.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: eligibleFilter() },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]),
  ]);

  const countByCategory = new Map(
    counts.map((entry) => [String(entry._id), entry.count] as const)
  );

  return categories.map((doc) => ({
    id: String(doc._id),
    name: doc.name,
    slug: doc.slug,
    postCount: countByCategory.get(String(doc._id)) ?? 0,
  }));
}

/* ── Admin services (posts) ────────────────────────────────────────────── */

export async function listAdminPosts(
  params: AdminBlogListParams = {}
): Promise<AdminBlogListResult> {
  await connectDB();

  const page = clampPage(params.page);
  const pageSize = clampPageSize(params.limit);

  const conditions: BlogFilter[] = [];

  if (params.q) {
    const rx = new RegExp(escapeRegex(params.q), "i");
    conditions.push({ $or: [{ title: rx }, { slug: rx }, { authorName: rx }] });
  }

  if (params.category) {
    if (mongoose.Types.ObjectId.isValid(params.category)) {
      conditions.push({ category: params.category });
    } else {
      const category = await BlogCategory.findOne({ slug: params.category })
        .select("_id")
        .lean();
      conditions.push({ category: category?._id ?? new mongoose.Types.ObjectId() });
    }
  }

  if (params.status) {
    if (!VALID_STATUSES.includes(params.status as BlogPostStatus)) {
      // Unknown status filter: honest empty result instead of ignoring it.
      return { posts: [], total: 0, page: 1, pageSize, totalPages: 0 };
    }
    conditions.push({ status: params.status as BlogPostStatus });
  }

  const query = conditions.length > 0 ? { $and: conditions } : {};

  const [total, docs] = await Promise.all([
    BlogPost.countDocuments(query),
    BlogPost.find(query)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .select(
        "title slug excerpt category authorName status isFeatured readingTimeMinutes coverImage publishedAt scheduledAt createdAt updatedAt"
      )
      .lean(),
  ]);

  const categories = await categoryRefMap(
    (docs as unknown as PostDoc[]).map((doc) =>
      typeof doc.category === "object" && doc.category ? doc.category._id : doc.category
    )
  );

  return {
    posts: (docs as unknown as PostDoc[]).map((doc) =>
      serializeAdminItem(doc, categories)
    ),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

async function loadPostDocument(id: string): Promise<IBlogPost> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, "Article not found", "NOT_FOUND");
  }

  const post = await BlogPost.findById(id);
  if (!post) {
    throw new ApiError(404, "Article not found", "NOT_FOUND");
  }
  return post;
}

export async function getAdminPost(id: string): Promise<AdminBlogDetailDTO> {
  await connectDB();
  const post = await loadPostDocument(id);

  const lean = asPostDoc(post.toObject());
  const categories = await categoryRefMap([
    typeof lean.category === "object" && lean.category ? lean.category._id : lean.category,
  ]);
  return serializeAdminDetail(lean, categories);
}

export async function createPost(
  input: CreateBlogInput,
  adminId?: string
): Promise<AdminBlogDetailDTO> {
  await connectDB();

  const category = await resolveCategory(input.category, { requireActive: true });
  const blocks = input.content as BlogBlock[];
  assertPublishable(blocks);

  const { status, scheduledAt } = normalizeSchedule(input.status, input.scheduledAt);
  if (status === "published") assertPublishable(blocks);

  let slug: string;
  if (input.slug) {
    const requestedSlug = slugify(input.slug);
    if (!requestedSlug) {
      throw new ApiError(400, "Please provide a valid URL slug", "INVALID_SLUG");
    }
    await assertSlugAvailable(requestedSlug);
    slug = requestedSlug;
  } else {
    slug = await uniquePostSlug(input.title);
  }

  const isFeatured = status === "published" && !!input.isFeatured;
  if (isFeatured) await unfeatureOthers();

  const subtitle = input.subtitle?.trim() ? input.subtitle.trim() : undefined;
  const seoMetaTitle = input.seoMetaTitle?.trim() ? input.seoMetaTitle.trim() : undefined;
  const seoMetaDescription = input.seoMetaDescription?.trim()
    ? input.seoMetaDescription.trim()
    : undefined;

  const doc = await BlogPost.create({
    title: input.title,
    slug,
    excerpt: input.excerpt,
    subtitle,
    content: blocks,
    searchText: buildSearchText({
      title: input.title,
      excerpt: input.excerpt,
      subtitle,
      content: blocks,
    }),
    category: category.id,
    authorName: input.authorName,
    createdBy: adminId && mongoose.Types.ObjectId.isValid(adminId) ? adminId : null,
    coverImage: input.coverImage ?? null,
    socialImage: input.socialImage ?? null,
    status,
    isFeatured,
    publishedAt: status === "published" ? new Date() : null,
    scheduledAt,
    readingTimeMinutes: calculateReadingTimeMinutes(blocks),
    seoMetaTitle,
    seoMetaDescription,
  });

  const lean = asPostDoc(doc.toObject());
  const categories = await categoryRefMap([category.id]);
  return serializeAdminDetail(lean, categories);
}

export async function updatePost(
  id: string,
  input: UpdateBlogInput
): Promise<AdminBlogDetailDTO> {
  await connectDB();
  const post = await loadPostDocument(id);

  const previous = asPostDoc(post.toObject());

  let categoryChanged = false;
  if (input.category !== undefined && String(input.category) !== String(previous.category)) {
    categoryChanged = true;
  }

  const category = input.category
    ? await resolveCategory(input.category, { requireActive: categoryChanged })
    : undefined;

  const nextTitle = input.title ?? previous.title;
  const nextExcerpt = input.excerpt ?? previous.excerpt;
  const nextSubtitleRaw = input.subtitle ?? previous.subtitle;
  const nextSubtitle = nextSubtitleRaw?.trim() ? nextSubtitleRaw.trim() : undefined;
  const nextContent = (input.content ?? previous.content) as BlogBlock[];

  if (input.content !== undefined) {
    assertPublishable(nextContent);
  }

  const nextStatus: BlogPostStatus = input.status ?? previous.status;
  const inheritedSchedule =
    input.scheduledAt === undefined && previous.scheduledAt
      ? new Date(previous.scheduledAt).toISOString()
      : (input.scheduledAt ?? null);
  const nextSchedule = normalizeSchedule(nextStatus, inheritedSchedule, {
    allowPast: input.scheduledAt === undefined,
  });

  if (nextStatus === "published") assertPublishable(nextContent);

  if (input.slug !== undefined && slugify(input.slug) !== previous.slug) {
    const nextSlug = slugify(input.slug);
    if (!nextSlug) {
      throw new ApiError(400, "Please provide a valid URL slug", "INVALID_SLUG");
    }
    await assertSlugAvailable(nextSlug, String(previous._id));
    post.slug = nextSlug;
  }

  post.title = nextTitle;
  post.excerpt = nextExcerpt;
  post.subtitle = nextSubtitle;
  post.content = nextContent;
  post.searchText = buildSearchText({
    title: nextTitle,
    excerpt: nextExcerpt,
    subtitle: nextSubtitle,
    content: nextContent,
  });
  post.readingTimeMinutes = calculateReadingTimeMinutes(nextContent);
  if (category) post.category = category.id;
  if (input.authorName !== undefined) post.authorName = input.authorName;
  if (input.coverImage !== undefined) post.coverImage = input.coverImage ?? null;
  if (input.socialImage !== undefined) post.socialImage = input.socialImage ?? null;
  if (input.seoMetaTitle !== undefined) {
    post.seoMetaTitle = input.seoMetaTitle.trim() ? input.seoMetaTitle.trim() : undefined;
  }
  if (input.seoMetaDescription !== undefined) {
    post.seoMetaDescription = input.seoMetaDescription.trim()
      ? input.seoMetaDescription.trim()
      : undefined;
  }

  const wasPublished = previous.status === "published";
  post.status = nextSchedule.status;
  post.scheduledAt = nextSchedule.scheduledAt;

  if (nextSchedule.status === "published") {
    if (!wasPublished || !post.publishedAt) {
      post.publishedAt = new Date();
    }
  }

  if (nextSchedule.status !== "published") {
    post.isFeatured = false;
  } else {
    post.isFeatured = input.isFeatured ?? previous.isFeatured;
    if (post.isFeatured) await unfeatureOthers(String(post._id));
  }

  await post.save();

  // Clean up images that were replaced on this post (never shared assets).
  const previousIds = collectPublicIds(previous);
  const nextIds = collectPublicIds(
    asPostDoc(post.toObject()) as unknown as Parameters<typeof collectPublicIds>[0]
  );
  const removed = previousIds.filter((publicId) => !nextIds.includes(publicId));
  if (removed.length > 0) {
    void cleanupUnusedImages(removed, String(post._id));
  }

  const lean = asPostDoc(post.toObject());
  const categories = await categoryRefMap([
    typeof lean.category === "object" && lean.category ? lean.category._id : lean.category,
  ]);
  return serializeAdminDetail(lean, categories);
}

export async function setPostStatus(
  id: string,
  status: BlogPostStatus,
  scheduledAt?: string
): Promise<AdminBlogDetailDTO> {
  await connectDB();
  const post = await loadPostDocument(id);

  const blocks = (post.content ?? []) as BlogBlock[];

  if (status === "published") {
    assertPublishable(blocks);
    const wasActive = post.status === "published";
    post.status = "published";
    post.publishedAt = wasActive && post.publishedAt ? post.publishedAt : new Date();
    post.scheduledAt = null;
    if (post.isFeatured) await unfeatureOthers(String(post._id));
  } else if (status === "scheduled") {
    const schedule = normalizeSchedule("scheduled", scheduledAt);
    post.status = "scheduled";
    post.scheduledAt = schedule.scheduledAt;
    post.publishedAt = null;
    post.isFeatured = false;
  } else if (status === "archived") {
    post.status = "archived";
    post.scheduledAt = null;
    post.isFeatured = false;
  } else {
    post.status = "draft";
    post.scheduledAt = null;
    post.isFeatured = false;
  }

  await post.save();

  const lean = asPostDoc(post.toObject());
  const categories = await categoryRefMap([
    typeof lean.category === "object" && lean.category ? lean.category._id : lean.category,
  ]);
  return serializeAdminDetail(lean, categories);
}

export async function setPostFeatured(
  id: string,
  isFeatured: boolean
): Promise<AdminBlogDetailDTO> {
  await connectDB();
  const post = await loadPostDocument(id);

  if (isFeatured) {
    const publishedAt = post.publishedAt ? new Date(post.publishedAt) : null;
    const eligible =
      post.status === "published" && publishedAt !== null && publishedAt.getTime() <= Date.now();

    if (!eligible) {
      throw new ApiError(
        400,
        "Only currently published articles can be featured on the blog page",
        "FEATURE_NOT_ELIGIBLE"
      );
    }
    await unfeatureOthers(String(post._id));
    post.isFeatured = true;
  } else {
    post.isFeatured = false;
  }

  await post.save();

  const lean = asPostDoc(post.toObject());
  const categories = await categoryRefMap([
    typeof lean.category === "object" && lean.category ? lean.category._id : lean.category,
  ]);
  return serializeAdminDetail(lean, categories);
}

export async function deletePost(id: string): Promise<{ slug: string }> {
  await connectDB();
  const post = await loadPostDocument(id);

  const lean = asPostDoc(post.toObject());
  const slug = lean.slug;
  const publicIds = collectPublicIds(lean);

  await post.deleteOne();

  if (publicIds.length > 0) {
    void cleanupUnusedImages(publicIds);
  }

  return { slug };
}

/* ── Admin services (categories) ───────────────────────────────────────── */

function serializeCategory(
  doc: { _id: unknown; name: string; slug: string; description: string; isActive: boolean; sortOrder: number; updatedAt?: Date },
  postCount: number
): BlogCategoryDTO {
  return {
    id: String(doc._id),
    name: doc.name,
    slug: doc.slug,
    description: doc.description ?? "",
    isActive: doc.isActive,
    sortOrder: doc.sortOrder ?? 0,
    postCount,
    updatedAt: toIso(doc.updatedAt),
  };
}

export async function listAdminBlogCategories(): Promise<BlogCategoryDTO[]> {
  await connectDB();

  const [categories, counts] = await Promise.all([
    BlogCategory.find()
      .sort({ sortOrder: 1, name: 1 })
      .lean(),
    BlogPost.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]),
  ]);

  const countByCategory = new Map(
    counts.map((entry) => [String(entry._id), entry.count] as const)
  );

  return categories.map((doc) =>
    serializeCategory(
      doc as unknown as Parameters<typeof serializeCategory>[0],
      countByCategory.get(String(doc._id)) ?? 0
    )
  );
}

async function assertCategoryNameAvailable(name: string, excludeId?: string): Promise<void> {
  const existing = await BlogCategory.findOne({ name }).select("_id").lean();
  if (existing && String(existing._id) !== excludeId) {
    throw new ApiError(
      400,
      `A blog category named "${name}" already exists`,
      "DUPLICATE_NAME"
    );
  }
}

async function uniqueCategorySlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "category";
  let candidate = root;
  let suffix = 1;

  for (;;) {
    const existing = await BlogCategory.findOne({ slug: candidate })
      .select("_id")
      .lean();
    if (!existing || String(existing._id) === excludeId) return candidate;
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }
}

export async function createBlogCategory(
  input: CreateBlogCategoryInput
): Promise<BlogCategoryDTO> {
  await connectDB();
  await assertCategoryNameAvailable(input.name);

  let slug: string;
  if (input.slug) {
    await assertSlugAvailableForCategory(input.slug);
    slug = slugify(input.slug);
  } else {
    slug = await uniqueCategorySlug(input.name);
  }

  const doc = await BlogCategory.create({
    name: input.name,
    slug,
    description: input.description ?? "",
    isActive: input.isActive ?? true,
    sortOrder: input.sortOrder ?? 0,
  });

  return serializeCategory(doc.toObject(), 0);
}

async function assertSlugAvailableForCategory(slug: string, excludeId?: string): Promise<void> {
  const existing = await BlogCategory.findOne({ slug }).select("_id").lean();
  if (existing && String(existing._id) !== excludeId) {
    throw new ApiError(
      400,
      `Another blog category already uses the slug "${slug}"`,
      "DUPLICATE_SLUG"
    );
  }
}

export async function updateBlogCategory(
  id: string,
  input: UpdateBlogCategoryInput
): Promise<BlogCategoryDTO> {
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, "Category not found", "NOT_FOUND");
  }

  const category = await BlogCategory.findById(id);
  if (!category) {
    throw new ApiError(404, "Category not found", "NOT_FOUND");
  }

  if (input.name !== undefined && input.name !== category.name) {
    await assertCategoryNameAvailable(input.name, String(category._id));
    category.name = input.name;
  }

  if (input.slug !== undefined) {
    const nextSlug = slugify(input.slug);
    if (!nextSlug) {
      throw new ApiError(400, "Please provide a valid category slug", "INVALID_SLUG");
    }
    if (nextSlug !== category.slug) {
      await assertSlugAvailableForCategory(nextSlug, String(category._id));
      category.slug = nextSlug;
    }
  }

  if (input.description !== undefined) category.description = input.description;
  if (input.isActive !== undefined) category.isActive = input.isActive;
  if (input.sortOrder !== undefined) category.sortOrder = input.sortOrder;

  await category.save();

  const postCount = await BlogPost.countDocuments({ category: category._id });
  return serializeCategory(category.toObject(), postCount);
}

export async function deleteBlogCategory(id: string): Promise<void> {
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, "Category not found", "NOT_FOUND");
  }

  const category = await BlogCategory.findById(id);
  if (!category) {
    throw new ApiError(404, "Category not found", "NOT_FOUND");
  }

  const postCount = await BlogPost.countDocuments({ category: category._id });
  if (postCount > 0) {
    throw new ApiError(
      400,
      `Cannot delete "${category.name}" because ${postCount} article${
        postCount === 1 ? " uses" : "s use"
      } it. Archive the category instead — no articles are removed.`,
      "CATEGORY_IN_USE"
    );
  }

  await category.deleteOne();
}

const blogService = {
  promoteDueScheduledPosts,
  listPublishedPosts,
  getFeaturedPublishedPost,
  getPublishedPostBySlug,
  getRelatedPublishedPosts,
  listPublicBlogCategories,
  listAdminPosts,
  getAdminPost,
  createPost,
  updatePost,
  setPostStatus,
  setPostFeatured,
  deletePost,
  listAdminBlogCategories,
  createBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
};

export default blogService;
