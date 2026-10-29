"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CheckCircle2,
  Eye,
  ExternalLink,
  GripVertical,
  ImagePlus,
  Loader2,
  Plus,
  Send,
  Star,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import AdminModal from "@/components/admin/AdminModal";
import RemoteImage from "@/components/common/RemoteImage";
import BlogContentRenderer from "@/components/blog/BlogContentRenderer";
import type {
  AdminBlogDetailDTO,
  BlogCategoryDTO,
} from "@/services/blog";
import type { BlogPostStatus } from "@/models/BlogPost";
import type { BlogBlockInput } from "@/lib/validations/blog";
import {
  calculateReadingTimeMinutes,
  countWords,
  extractPlainText,
  isEmptyContent,
  type BlogBlock,
} from "@/lib/utils/blog-content";
import { slugify } from "@/lib/utils/slug";

type BlogStatus = BlogPostStatus;

interface BlogEditorProps {
  categories: BlogCategoryDTO[];
  /** Existing article in edit mode, or null when creating a new one. */
  post: AdminBlogDetailDTO | null;
}

type BlockDraft = BlogBlockInput;

type ImageValue = { url: string; publicId?: string; alt: string };

const BLOCK_TYPE_LABELS: Record<BlockDraft["type"], string> = {
  heading: "Heading",
  paragraph: "Paragraph",
  bulletList: "Bullet list",
  orderedList: "Numbered list",
  blockquote: "Quote",
  image: "Image",
};

function makeBlock(type: BlockDraft["type"]): BlockDraft {
  switch (type) {
    case "heading":
      return { type, level: 2, text: "" };
    case "paragraph":
      return { type, text: "" };
    case "bulletList":
    case "orderedList":
      return { type, items: [""] };
    case "blockquote":
      return { type, text: "" };
    case "image":
      return { type, url: "", alt: "", caption: "" };
  }
}

function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const EMPTY_IMAGE: ImageValue = { url: "", alt: "" };

export default function BlogEditor({ categories, post }: BlogEditorProps) {
  const router = useRouter();

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(post?.slug));
  const [subtitle, setSubtitle] = useState(post?.subtitle ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [authorName, setAuthorName] = useState(post?.authorName ?? "");
  const [categoryId, setCategoryId] = useState(post?.category?.id ?? "");
  const [coverImage, setCoverImage] = useState<ImageValue>(
    post?.coverImage
      ? {
          url: post.coverImage.url,
          publicId: post.coverImage.publicId,
          alt: post.coverImage.alt,
        }
      : EMPTY_IMAGE
  );
  const [socialImage, setSocialImage] = useState<ImageValue>(
    post?.socialImage
      ? {
          url: post.socialImage.url,
          publicId: post.socialImage.publicId,
          alt: post.socialImage.alt,
        }
      : EMPTY_IMAGE
  );
  const [seoMetaTitle, setSeoMetaTitle] = useState(post?.seoMetaTitle ?? "");
  const [seoMetaDescription, setSeoMetaDescription] = useState(
    post?.seoMetaDescription ?? ""
  );
  const [blocks, setBlocks] = useState<BlockDraft[]>(
    post?.content?.length
      ? (post.content as BlockDraft[])
      : [makeBlock("heading"), makeBlock("paragraph")]
  );

  const [status, setStatus] = useState<BlogStatus>(post?.status ?? "draft");
  const [isFeatured, setIsFeatured] = useState(post?.isFeatured ?? false);
  const [scheduledAtLocal, setScheduledAtLocal] = useState(
    toLocalInputValue(post?.scheduledAt)
  );

  const [saving, setSaving] = useState(false);
  const [statusAction, setStatusAction] = useState<BlogStatus | null>(null);
  const [togglingFeature, setTogglingFeature] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const baselineRef = useRef<string | null>(null);

  const snapshot = useCallback(
    () =>
      JSON.stringify({
        title,
        slug,
        subtitle,
        excerpt,
        authorName,
        categoryId,
        coverImage,
        socialImage,
        seoMetaTitle,
        seoMetaDescription,
        blocks,
      }),
    [
      title,
      slug,
      subtitle,
      excerpt,
      authorName,
      categoryId,
      coverImage,
      socialImage,
      seoMetaTitle,
      seoMetaDescription,
      blocks,
    ]
  );

  useEffect(() => {
    baselineRef.current = snapshot();
    // Baseline is captured once on mount to detect later edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (
        baselineRef.current !== null &&
        snapshot() !== baselineRef.current
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [snapshot]);

  const wordCount = useMemo(
    () => countWordsSafe(blocks),
    [blocks]
  );
  const readingTime = useMemo(
    () => calculateReadingTimeMinutes(blocks),
    [blocks]
  );

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setSlug(slugify(value));
  };

  const updateBlock = (index: number, patch: Partial<BlockDraft>) => {
    setBlocks((prev) =>
      prev.map((block, i) =>
        i === index ? ({ ...block, ...patch } as BlockDraft) : block
      )
    );
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    setBlocks((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeBlock = (index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const addBlock = (type: BlockDraft["type"]) => {
    setBlocks((prev) => [...prev, makeBlock(type)]);
  };

  const uploadImage = async (file: File): Promise<ImageValue> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/uploads/blog-image", {
      method: "POST",
      body: formData,
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || "Failed to upload the image.");
    }
    return {
      url: json.data.imageUrl,
      publicId: json.data.cloudinaryPublicId,
      alt: "",
    };
  };

  const handleFieldUpload = async (
    key: string,
    file: File,
    onDone: (image: ImageValue) => void
  ) => {
    setUploadingKey(key);
    setError(null);
    try {
      onDone(await uploadImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingKey(null);
    }
  };

  const validate = (): string | null => {
    if (title.trim().length < 3) return "Title must be at least 3 characters.";
    if (excerpt.trim().length < 10)
      return "Excerpt must be at least 10 characters.";
    if (!categoryId) return "Please choose a category.";
    if (!authorName.trim()) return "Author name is required.";
    if (isEmptyContent(blocks)) return "Add at least one content block.";
    for (const block of blocks) {
      if (block.type === "image" && !block.url) {
        return "Every image block needs an uploaded image.";
      }
      if (
        (block.type === "bulletList" || block.type === "orderedList") &&
        !block.items.some((item) => item.trim())
      ) {
        return "List blocks need at least one item.";
      }
      if (
        (block.type === "heading" ||
          block.type === "paragraph" ||
          block.type === "blockquote") &&
        !block.text.trim()
      ) {
        return `Empty ${BLOCK_TYPE_LABELS[block.type].toLowerCase()} block — fill it in or remove it.`;
      }
    }
    return null;
  };

  const buildPayload = () => {
    const cleaned: BlockDraft[] = blocks
      .map((block) => {
        if (block.type === "bulletList" || block.type === "orderedList") {
          const items = block.items.map((item) => item.trim()).filter(Boolean);
          return { ...block, items } as BlockDraft;
        }
        if (block.type === "image") {
          return {
            ...block,
            caption: block.caption?.trim() || undefined,
          } as BlockDraft;
        }
        return block;
      })
      .filter((block) => {
        if (block.type === "bulletList" || block.type === "orderedList")
          return block.items.length > 0;
        if (block.type === "image") return Boolean(block.url);
        return Boolean(block.text.trim());
      });

    return {
      title: title.trim(),
      slug: slug.trim() || undefined,
      excerpt: excerpt.trim(),
      subtitle: subtitle.trim() || undefined,
      content: cleaned,
      category: categoryId,
      authorName: authorName.trim(),
      coverImage: coverImage.url
        ? { url: coverImage.url, publicId: coverImage.publicId, alt: coverImage.alt }
        : null,
      socialImage: socialImage.url
        ? {
            url: socialImage.url,
            publicId: socialImage.publicId,
            alt: socialImage.alt,
          }
        : null,
      seoMetaTitle: seoMetaTitle.trim() || undefined,
      seoMetaDescription: seoMetaDescription.trim() || undefined,
    };
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const payload = buildPayload();
      const res = await fetch(
        post ? `/api/admin/blogs/${post.id}` : "/api/admin/blogs",
        {
          method: post ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Failed to save the article.");
        return;
      }

      baselineRef.current = snapshot();

      if (!post) {
        const created: AdminBlogDetailDTO | undefined = json.data?.post;
        if (created) {
          router.push(`/admin/blogs/${created.id}`);
          return;
        }
      }

      setStatus(json.data?.post?.status ?? status);
      setSuccessMsg("Article saved.");
    } catch {
      setError("Unable to save the article. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusAction = async (
    next: Exclude<BlogStatus, "scheduled"> | "scheduled",
    options?: { scheduledAt?: string }
  ) => {
    if (!post) return;

    setStatusAction(next);
    setError(null);
    setSuccessMsg(null);
    try {
      const body: Record<string, unknown> = { status: next };
      if (next === "scheduled") {
        if (!options?.scheduledAt) {
          setError("Pick a future date and time to schedule this article.");
          return;
        }
        body.scheduledAt = options.scheduledAt;
      }

      const res = await fetch(`/api/admin/blogs/${post.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Failed to update the status.");
        return;
      }

      setStatus(json.data?.post?.status ?? next);
      if (next === "scheduled" && options?.scheduledAt) {
        setScheduledAtLocal(toLocalInputValue(options.scheduledAt));
      }
      setSuccessMsg(
        next === "published"
          ? "The article is live."
          : next === "scheduled"
            ? "The article is scheduled and will go live automatically."
            : next === "archived"
              ? "The article was unpublished."
              : "The article was moved back to draft."
      );
      setScheduleOpen(false);
      router.refresh();
    } catch {
      setError("Unable to update the status. Please try again.");
    } finally {
      setStatusAction(null);
    }
  };

  const submitSchedule = () => {
    if (!scheduledAtLocal) {
      setError("Pick a future date and time to schedule this article.");
      return;
    }
    const when = new Date(scheduledAtLocal);
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      setError("Schedule time must be in the future.");
      return;
    }
    handleStatusAction("scheduled", { scheduledAt: when.toISOString() });
  };

  const handleToggleFeature = async () => {
    if (!post) return;
    setTogglingFeature(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/blogs/${post.id}/feature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !isFeatured }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Failed to update the featured flag.");
        return;
      }
      setIsFeatured(!isFeatured);
      setSuccessMsg(
        !isFeatured
          ? "Article featured on the blog page."
          : "Article removed from featured."
      );
    } catch {
      setError("Unable to update the featured flag. Please try again.");
    } finally {
      setTogglingFeature(false);
    }
  };

  const previewBlocks = useMemo(
    () =>
      (blocks as BlogBlock[]).filter((block) => {
        if (block.type === "bulletList" || block.type === "orderedList")
          return block.items.some((item) => item.trim());
        if (block.type === "image") return Boolean(block.url);
        return Boolean(block.text?.trim());
      }),
    [blocks]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link
            href="/admin/blogs"
            className="inline-flex items-center gap-1 font-medium text-emerald-600 hover:text-emerald-700"
          >
            <Undo2 className="h-4 w-4" />
            Back to articles
          </Link>
          {post && (
            <span className="hidden sm:inline">
              · Editing &ldquo;{post.title}&rdquo;
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          {post && status === "published" && (
            <Link
              href={`/blogs/${post.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <ExternalLink className="h-4 w-4" />
              View live
            </Link>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : post ? (
              "Save Changes"
            ) : (
              "Save Draft"
            )}
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {post && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Status
            </span>
            <StatusBadge status={status} />
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {status !== "published" && (
                <button
                  type="button"
                  onClick={() => handleStatusAction("published")}
                  disabled={statusAction !== null || saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {statusAction === "published" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  {status === "scheduled" ? "Publish now" : "Publish"}
                </button>
              )}
              {status === "scheduled" && (
                <button
                  type="button"
                  onClick={() => setScheduleOpen(true)}
                  disabled={statusAction !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  Reschedule
                </button>
              )}
              {status !== "scheduled" && status !== "published" && (
                <button
                  type="button"
                  onClick={() => setScheduleOpen(true)}
                  disabled={statusAction !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  Schedule
                </button>
              )}
              {status === "published" && (
                <button
                  type="button"
                  onClick={() => handleStatusAction("archived")}
                  disabled={statusAction !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  {statusAction === "archived" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                  Unpublish
                </button>
              )}
              {(status === "archived" || status === "published") && (
                <button
                  type="button"
                  onClick={() => handleStatusAction("draft")}
                  disabled={statusAction !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Back to draft
                </button>
              )}
              {status === "published" && (
                <button
                  type="button"
                  onClick={handleToggleFeature}
                  disabled={togglingFeature}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                    isFeatured
                      ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {togglingFeature ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Star
                      className={`h-3.5 w-3.5 ${isFeatured ? "fill-amber-400" : ""}`}
                    />
                  )}
                  {isFeatured ? "Featured" : "Feature"}
                </button>
              )}
            </div>
          </div>
          {status === "scheduled" && post.scheduledAt && (
            <p className="mt-2 text-xs text-gray-500">
              Goes live automatically{" "}
              {new Date(post.scheduledAt).toLocaleString("en-IN")}.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              maxLength={180}
              placeholder="e.g. How to recycle household scrap the right way"
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-lg font-semibold text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />

            <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Slug {slugTouched && <span className="normal-case">(manual)</span>}
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              maxLength={200}
              placeholder="auto-generated-from-title"
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {!slugTouched && slug && (
              <p className="mt-1 text-xs text-gray-400">
                Public URL: /blogs/{slug}
              </p>
            )}

            <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Subtitle <span className="normal-case text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              maxLength={300}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />

            <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Excerpt
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              maxLength={600}
              placeholder="A short summary shown on listing cards and in search results."
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="mt-1 text-right text-xs text-gray-400">
              {excerpt.trim().length}/600
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Article content
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  {wordCount} word{wordCount === 1 ? "" : "s"} ·{" "}
                  {readingTime} min read · {blocks.length} block
                  {blocks.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(
                [
                  "heading",
                  "paragraph",
                  "bulletList",
                  "orderedList",
                  "blockquote",
                  "image",
                ] as const
              ).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addBlock(type)}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-emerald-400 hover:text-emerald-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {BLOCK_TYPE_LABELS[type]}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {blocks.map((block, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-gray-200 bg-gray-50/60 p-3"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-gray-300" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {BLOCK_TYPE_LABELS[block.type]}
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveBlock(index, -1)}
                        disabled={index === 0}
                        title="Move up"
                        className="rounded-md p-1 text-gray-400 transition hover:bg-white hover:text-gray-700 disabled:opacity-30"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlock(index, 1)}
                        disabled={index === blocks.length - 1}
                        title="Move down"
                        className="rounded-md p-1 text-gray-400 transition hover:bg-white hover:text-gray-700 disabled:opacity-30"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeBlock(index)}
                        title="Delete block"
                        className="rounded-md p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <BlockFields
                    block={block}
                    uploading={uploadingKey === `block-${index}`}
                    onChange={(patch) => updateBlock(index, patch)}
                    onUpload={(file) =>
                      handleFieldUpload(`block-${index}`, file, (image) =>
                        updateBlock(index, {
                          url: image.url,
                          publicId: image.publicId,
                        } as Partial<BlockDraft>)
                      )
                    }
                  />
                </div>
              ))}

              {blocks.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500">
                  No content yet — add your first block above.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Details</h2>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Choose a category…</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {!category.isActive ? " (archived)" : ""}
                </option>
              ))}
            </select>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Author name
            </label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              maxLength={120}
              placeholder="e.g. Scrapi Team"
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <ImageField
            label="Cover image"
            hint="Shown on listing cards and at the top of the article. JPG/PNG/WebP up to 5 MB."
            value={coverImage}
            uploading={uploadingKey === "cover"}
            onAltChange={(alt) => setCoverImage((prev) => ({ ...prev, alt }))}
            onRemove={() => setCoverImage(EMPTY_IMAGE)}
            onPick={(file) =>
              handleFieldUpload("cover", file, (image) =>
                setCoverImage((prev) => ({ ...prev, url: image.url, publicId: image.publicId }))
              )
            }
          />

          <ImageField
            label="Social share image"
            hint="Optional. Used for WhatsApp/Twitter previews. Defaults to the cover image."
            value={socialImage}
            uploading={uploadingKey === "social"}
            onAltChange={(alt) => setSocialImage((prev) => ({ ...prev, alt }))}
            onRemove={() => setSocialImage(EMPTY_IMAGE)}
            onPick={(file) =>
              handleFieldUpload("social", file, (image) =>
                setSocialImage((prev) => ({
                  ...prev,
                  url: image.url,
                  publicId: image.publicId,
                }))
              )
            }
          />

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">
              Search metadata
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Optional. Falls back to the title and excerpt when left empty.
            </p>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Meta title ({seoMetaTitle.length}/70)
            </label>
            <input
              type="text"
              value={seoMetaTitle}
              onChange={(e) => setSeoMetaTitle(e.target.value)}
              maxLength={70}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Meta description ({seoMetaDescription.length}/180)
            </label>
            <textarea
              value={seoMetaDescription}
              onChange={(e) => setSeoMetaDescription(e.target.value)}
              rows={3}
              maxLength={180}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      <AdminModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title={status === "scheduled" ? "Reschedule article" : "Schedule article"}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            The article goes live automatically at the chosen time (IST) — no
            further manual action needed.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Publication time
            </label>
            <input
              type="datetime-local"
              value={scheduledAtLocal}
              onChange={(e) => setScheduledAtLocal(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setScheduleOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitSchedule}
              disabled={statusAction !== null}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {statusAction === "scheduled" ? "Scheduling…" : "Schedule"}
            </button>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Preview"
        size="xl"
      >
        <article className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            Preview
          </p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
            {title || "Untitled article"}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>{authorName || "Unknown author"}</span>
            <span>
              {categories.find((c) => c.id === categoryId)?.name ??
                "No category"}
            </span>
            <span>
              {wordCount} words · {readingTime} min read
            </span>
          </div>

          {coverImage.url && (
            <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
              <RemoteImage
                src={coverImage.url}
                alt={coverImage.alt || "Cover preview"}
                loading="eager"
                className="aspect-[16/9] h-auto w-full object-cover"
              />
            </div>
          )}

          {excerpt && (
            <p className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm italic text-gray-600">
              {excerpt}
            </p>
          )}

          <div className="mt-6 text-gray-800">
            {previewBlocks.length > 0 ? (
              <BlogContentRenderer blocks={previewBlocks} />
            ) : (
              <p className="text-sm text-gray-500">
                No content blocks to preview yet.
              </p>
            )}
          </div>
        </article>
      </AdminModal>
    </div>
  );
}

function StatusBadge({ status }: { status: BlogStatus }) {
  const styles: Record<BlogStatus, string> = {
    draft: "bg-gray-100 text-gray-600 ring-gray-200",
    scheduled: "bg-blue-50 text-blue-700 ring-blue-100",
    published: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    archived: "bg-amber-50 text-amber-700 ring-amber-100",
  };
  const labels: Record<BlogStatus, string> = {
    draft: "Draft",
    scheduled: "Scheduled",
    published: "Published",
    archived: "Unpublished",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function ImageField({
  label,
  hint,
  value,
  uploading,
  onAltChange,
  onRemove,
  onPick,
}: {
  label: string;
  hint: string;
  value: ImageValue;
  uploading: boolean;
  onAltChange: (alt: string) => void;
  onRemove: () => void;
  onPick: (file: File) => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">{label}</h2>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>

      <div className="mt-3 flex items-start gap-3">
        <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          {value.url ? (
            <RemoteImage
              src={value.url}
              alt={value.alt || `${label} preview`}
              loading="eager"
              className="h-full w-full object-cover"
            />
          ) : (
            <ImagePlus className="h-5 w-5 text-gray-300" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
            {uploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Uploading…
              </>
            ) : value.url ? (
              "Replace"
            ) : (
              "Upload image"
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) onPick(file);
              }}
            />
          </label>
          {value.url && !uploading && (
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50"
            >
              <X className="h-3.5 w-3.5" />
              Remove
            </button>
          )}
        </div>
      </div>

      <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-gray-400">
        Alt text
      </label>
      <input
        type="text"
        value={value.alt}
        onChange={(e) => onAltChange(e.target.value)}
        maxLength={300}
        placeholder="Describe the image for accessibility"
        className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
    </div>
  );
}

function BlockFields({
  block,
  uploading,
  onChange,
  onUpload,
}: {
  block: BlockDraft;
  uploading: boolean;
  onChange: (patch: Partial<BlockDraft>) => void;
  onUpload: (file: File) => void;
}) {
  if (block.type === "heading") {
    return (
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={block.level}
          onChange={(e) =>
            onChange({ level: Number(e.target.value) as 2 | 3 | 4 })
          }
          className="rounded-lg border border-gray-300 px-2 py-2 text-xs focus:border-emerald-500 focus:outline-none"
        >
          <option value={2}>H2</option>
          <option value={3}>H3</option>
          <option value={4}>H4</option>
        </select>
        <input
          type="text"
          value={block.text}
          onChange={(e) => onChange({ text: e.target.value })}
          maxLength={300}
          placeholder="Section heading"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>
    );
  }

  if (block.type === "paragraph" || block.type === "blockquote") {
    return (
      <textarea
        value={block.text}
        onChange={(e) => onChange({ text: e.target.value })}
        rows={3}
        maxLength={block.type === "paragraph" ? 6000 : 3000}
        placeholder={
          block.type === "paragraph"
            ? "Write a paragraph. **bold**, *italic* and [links](https://…) are supported."
            : "A notable quote or callout…"
        }
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
    );
  }

  if (block.type === "bulletList" || block.type === "orderedList") {
    return (
      <div className="space-y-2">
        {block.items.map((item, itemIndex) => (
          <div key={itemIndex} className="flex items-start gap-2">
            <span className="mt-2 w-5 shrink-0 text-right text-xs text-gray-400">
              {itemIndex + 1}.
            </span>
            <input
              type="text"
              value={item}
              onChange={(e) => {
                const items = [...block.items];
                items[itemIndex] = e.target.value;
                onChange({ items });
              }}
              maxLength={1000}
              placeholder="List item"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => {
                const items = block.items.filter((_, i) => i !== itemIndex);
                onChange({ items: items.length ? items : [""] });
              }}
              title="Remove item"
              className="mt-1.5 rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ items: [...block.items, ""] })}
          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Add item
        </button>
      </div>
    );
  }

  // image
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        {block.url ? (
          <div className="h-20 w-28 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <RemoteImage
              src={block.url}
              alt={block.alt || "Block image preview"}
              loading="eager"
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex h-20 w-28 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white">
            <ImagePlus className="h-5 w-5 text-gray-300" />
          </div>
        )}
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
          {uploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Uploading…
            </>
          ) : block.url ? (
            "Replace image"
          ) : (
            "Upload image"
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onUpload(file);
            }}
          />
        </label>
      </div>
      <input
        type="text"
        value={block.alt ?? ""}
        onChange={(e) => onChange({ alt: e.target.value } as Partial<BlockDraft>)}
        maxLength={300}
        placeholder="Alt text"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
      <input
        type="text"
        value={block.caption ?? ""}
        onChange={(e) =>
          onChange({ caption: e.target.value } as Partial<BlockDraft>)
        }
        maxLength={300}
        placeholder="Caption (optional)"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
    </div>
  );
}

function countWordsSafe(blocks: BlockDraft[]): number {
  return countWords(extractPlainText(blocks as unknown[]));
}
