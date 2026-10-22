import mongoose, { Schema, Document } from "mongoose";
import type { BlogBlock } from "@/lib/utils/blog-content";

export type BlogPostStatus = "draft" | "scheduled" | "published" | "archived";

export interface BlogImageMeta {
  url: string;
  publicId?: string;
  alt: string;
}

export interface IBlogPost extends Document {
  title: string;
  slug: string;
  excerpt: string;
  subtitle?: string;
  content: BlogBlock[];
  /** Lowercased plain text of title/excerpt/content — powers public search. */
  searchText: string;
  category: mongoose.Types.ObjectId;
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
  createdAt: Date;
  updatedAt: Date;
}

const BlogImageSchema = new Schema<BlogImageMeta>(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    alt: { type: String, default: "" },
  },
  { _id: false }
);

const BlogPostSchema = new Schema<IBlogPost>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    excerpt: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true },
    content: { type: Schema.Types.Mixed, default: [] },
    searchText: { type: String, default: "" },
    category: {
      type: Schema.Types.ObjectId,
      ref: "BlogCategory",
      required: true,
      index: true,
    },
    authorName: { type: String, required: true, trim: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    coverImage: { type: BlogImageSchema, default: null },
    socialImage: { type: BlogImageSchema, default: null },
    status: {
      type: String,
      enum: ["draft", "scheduled", "published", "archived"],
      default: "draft",
      index: true,
    },
    isFeatured: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    scheduledAt: { type: Date, default: null },
    readingTimeMinutes: { type: Number, default: 1 },
    seoMetaTitle: { type: String, trim: true },
    seoMetaDescription: { type: String, trim: true },
  },
  { timestamps: true, strict: true }
);

/* Public listing: eligible published articles ordered by date. */
BlogPostSchema.index({ status: 1, publishedAt: -1 });
/* Category browsing inside the published set. */
BlogPostSchema.index({ category: 1, status: 1, publishedAt: -1 });
/* Featured hero lookup. */
BlogPostSchema.index({ isFeatured: 1, status: 1, publishedAt: -1 });
/* Due scheduled-article promotion. */
BlogPostSchema.index({ status: 1, scheduledAt: 1 });
/* Admin last-updated ordering. */
BlogPostSchema.index({ updatedAt: -1 });

export default mongoose.models.BlogPost ||
  mongoose.model<IBlogPost>("BlogPost", BlogPostSchema);
