"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Eye,
  Globe2,
  Loader2,
  Save,
  Send,
  Star,
  Undo2,
  X,
} from "lucide-react";
import AdminModal from "@/components/admin/AdminModal";
import RemoteImage from "@/components/common/RemoteImage";
import BlogContentRenderer from "@/components/blog/BlogContentRenderer";
import type { AdminBlogDetailDTO, BlogCategoryDTO } from "@/services/blog";
import {
  calculateReadingTimeMinutes,
  countWords,
  extractPlainText,
  type BlogBlock,
} from "@/lib/utils/blog-content";
import {
  blockToEditorHtml,
  blocksToEditorHtml,
  editorRootToBlocks,
  escapeHtml,
} from "@/lib/utils/rich-blog-content";
import { parseSocialEmbed } from "@/lib/utils/social-embeds";
import { slugify } from "@/lib/utils/slug";
import BlogEditorToolbar from "./editor/Toolbar";
import ImageField from "./editor/ImageField";
import {
  EmbedDialog,
  ImageDialog,
  InlineLinkDialog,
  LinkCardDialog,
} from "./editor/MediaDialogs";
import {
  EMPTY_FORMAT_STATE,
  EMPTY_IMAGE,
  STATUS_LABELS,
  cleanBlocks,
  deriveExcerpt,
  formatStateEqual,
  imageValueFromDTO,
  placeCaretAtEnd,
  toLocalInputValue,
  type BlogStatus,
  type FormatState,
  type ImageFieldKey,
  type ImageValue,
} from "./editor/helpers";

interface BlogEditorProps {
  categories: BlogCategoryDTO[];
  /** Existing article in edit mode, or null when creating a new one. */
  post: AdminBlogDetailDTO | null;
}

type DialogKind = "image" | "embed" | "link" | "linkCard" | "schedule" | "preview";

interface SavedArticle {
  id: string;
  blocks: BlogBlock[];
}

const STATUS_STYLES: Record<BlogStatus, string> = {
  draft: "bg-gray-100 text-gray-600 ring-gray-200",
  scheduled: "bg-blue-50 text-blue-700 ring-blue-100",
  published: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  archived: "bg-amber-50 text-amber-700 ring-amber-100",
};

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";
const labelClass =
  "block text-xs font-semibold uppercase tracking-wide text-gray-400";

export default function BlogEditor({ categories, post }: BlogEditorProps) {
  const router = useRouter();

  const [postId, setPostId] = useState<string | null>(post?.id ?? null);
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(post?.slug));
  const [subtitle, setSubtitle] = useState(post?.subtitle ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [authorName, setAuthorName] = useState(post?.authorName ?? "");
  const [categoryId, setCategoryId] = useState(post?.category?.id ?? "");
  const [coverImage, setCoverImage] = useState<ImageValue>(
    imageValueFromDTO(post?.coverImage)
  );
  const [socialImage, setSocialImage] = useState<ImageValue>(
    imageValueFromDTO(post?.socialImage)
  );
  const [seoMetaTitle, setSeoMetaTitle] = useState(post?.seoMetaTitle ?? "");
  const [seoMetaDescription, setSeoMetaDescription] = useState(
    post?.seoMetaDescription ?? ""
  );
  const [blocks, setBlocks] = useState<BlogBlock[]>(post?.content ?? []);

  const [status, setStatus] = useState<BlogStatus>(post?.status ?? "draft");
  const [isFeatured, setIsFeatured] = useState(post?.isFeatured ?? false);
  const [scheduledAt, setScheduledAt] = useState<string | null>(
    post?.scheduledAt ?? null
  );
  const [scheduleInput, setScheduleInput] = useState(
    toLocalInputValue(post?.scheduledAt)
  );

  const [saving, setSaving] = useState(false);
  const [statusAction, setStatusAction] = useState<BlogStatus | null>(null);
  const [togglingFeature, setTogglingFeature] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<ImageFieldKey | null>(null);
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [formatState, setFormatState] =
    useState<FormatState>(EMPTY_FORMAT_STATE);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const initializedRef = useRef(false);
  const baselineRef = useRef<string | null>(null);

  const busy = saving || statusAction !== null;

  const effectiveExcerpt = useMemo(
    () => excerpt.trim() || deriveExcerpt(blocks, title),
    [excerpt, blocks, title]
  );

  const wordCount = useMemo(
    () => countWords(extractPlainText(blocks)),
    [blocks]
  );

  const readingTime = useMemo(
    () => calculateReadingTimeMinutes(blocks),
    [blocks]
  );

  const previewBlocks = useMemo(() => cleanBlocks(blocks), [blocks]);

  const serialize = useCallback(
    (content: BlogBlock[]) =>
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
        blocks: content,
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
    ]
  );

  const snapshot = useCallback(
    () => serialize(blocks),
    [serialize, blocks]
  );

  useEffect(() => {
    const root = editorRef.current;
    if (!root || initializedRef.current) return;
    const initial = post?.content ?? [];
    root.innerHTML = initial.length
      ? blocksToEditorHtml(initial)
      : "<p><br></p>";
    setBlocks(initial);
    initializedRef.current = true;
  }, [post]);

  useEffect(() => {
    if (baselineRef.current === null) baselineRef.current = snapshot();
  }, [snapshot]);

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

  const getLatestBlocks = (): BlogBlock[] => {
    const root = editorRef.current;
    return root ? editorRootToBlocks(root) : blocks;
  };

  const syncFromEditor = (): BlogBlock[] => {
    const next = getLatestBlocks();
    setBlocks(next);
    refreshFormatState();
    return next;
  };

  const refreshFormatState = () => {
    const root = editorRef.current;
    const selection = window.getSelection();
    if (!root || !selection || selection.rangeCount === 0) return;
    const anchor = selection.anchorNode;
    if (!anchor || !root.contains(anchor)) return;

    const anchorElement =
      anchor.nodeType === Node.ELEMENT_NODE
        ? (anchor as HTMLElement)
        : anchor.parentElement;
    const block = anchorElement
      ?.closest("h2, h3, h4, blockquote, p, li")
      ?.tagName.toLowerCase();

    const next: FormatState = {
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      bulletList: document.queryCommandState("insertUnorderedList"),
      orderedList: document.queryCommandState("insertOrderedList"),
      quote: block === "blockquote",
      left: document.queryCommandState("justifyLeft"),
      center: document.queryCommandState("justifyCenter"),
      right: document.queryCommandState("justifyRight"),
      block: block ?? "",
    };

    setFormatState((previous) =>
      formatStateEqual(previous, next) ? previous : next
    );
  };

  const saveSelection = () => {
    const root = editorRef.current;
    const selection = window.getSelection();
    if (
      !root ||
      !selection ||
      selection.rangeCount === 0 ||
      !selection.anchorNode ||
      !root.contains(selection.anchorNode)
    ) {
      savedRangeRef.current = null;
      setSelectedText("");
      return;
    }
    savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    setSelectedText(selection.toString());
  };

  const restoreSelection = () => {
    const root = editorRef.current;
    if (!root) return;
    root.focus();
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    const saved = savedRangeRef.current;
    if (saved && root.contains(saved.commonAncestorContainer)) {
      selection.addRange(saved);
    } else {
      placeCaretAtEnd(root);
    }
  };

  const insertHtml = (html: string) => {
    const root = editorRef.current;
    if (!root) return;
    restoreSelection();
    let inserted = false;
    try {
      inserted = document.execCommand("insertHTML", false, html);
    } catch {
      inserted = false;
    }
    if (!inserted) {
      root.insertAdjacentHTML("beforeend", html);
    }
    savedRangeRef.current = null;
    syncFromEditor();
  };

  const insertBlock = (block: BlogBlock) => {
    insertHtml(`${blockToEditorHtml(block)}<p><br></p>`);
  };

  const applyCommand = (command: string, value?: string) => {
    const root = editorRef.current;
    if (!root) return;
    root.focus();
    try {
      document.execCommand(command, false, value);
    } catch {
      return;
    }
    syncFromEditor();
  };

  const handleRemoveMedia = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("[data-blog-action='remove-media']");
    if (!button) return;
    event.preventDefault();
    const figure = button.closest("figure[data-blog-block]");
    if (!figure) return;
    figure.remove();
    syncFromEditor();
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setSlug(slugify(value));
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

  const uploadFieldImage = async (key: ImageFieldKey, file: File) => {
    setUploadingKey(key);
    setError(null);
    try {
      const image = await uploadImage(file);
      if (key === "cover") {
        setCoverImage((previous) => ({ ...previous, ...image }));
      } else {
        setSocialImage((previous) => ({ ...previous, ...image }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploadingKey(null);
    }
  };

  const openImageDialog = () => {
    saveSelection();
    setImageError(null);
    setDialog("image");
  };

  const handleInsertImage = async (
    file: File,
    alt: string,
    caption: string
  ) => {
    setImageBusy(true);
    setImageError(null);
    try {
      const image = await uploadImage(file);
      insertBlock({
        type: "image",
        url: image.url,
        publicId: image.publicId,
        alt,
        ...(caption ? { caption } : {}),
      });
      setDialog(null);
    } catch (err) {
      setImageError(
        err instanceof Error ? err.message : "Image upload failed."
      );
    } finally {
      setImageBusy(false);
    }
  };

  const handleInsertEmbed = (url: string, embedTitle: string) => {
    const parsed = parseSocialEmbed(url);
    if (!parsed) return;
    insertBlock({
      type: "embed",
      provider: parsed.provider,
      url: parsed.url,
      embedUrl: parsed.embedUrl,
      ...(embedTitle ? { title: embedTitle } : {}),
    });
    setDialog(null);
  };

  const handleInsertInlineLink = (
    url: string,
    text: string,
    replaceSelection: boolean
  ) => {
    const root = editorRef.current;
    let linked = false;
    if (
      replaceSelection &&
      root &&
      savedRangeRef.current &&
      root.contains(savedRangeRef.current.commonAncestorContainer)
    ) {
      restoreSelection();
      try {
        linked = document.execCommand("createLink", false, url);
      } catch {
        linked = false;
      }
    }
    if (linked) {
      syncFromEditor();
    } else {
      insertHtml(`<a href="${escapeHtml(url)}">${escapeHtml(text)}</a>`);
    }
    savedRangeRef.current = null;
    setDialog(null);
  };

  const handleInsertLinkCard = (
    url: string,
    linkTitle: string,
    description: string
  ) => {
    insertBlock({
      type: "link",
      url,
      title: linkTitle,
      ...(description ? { description } : {}),
    });
    setDialog(null);
  };

  const validateContent = (content: BlogBlock[]): string | null => {
    if (title.trim().length < 3) {
      return "Title must be at least 3 characters.";
    }
    if (!categoryId) return "Please choose a category.";
    if (!authorName.trim()) return "Author name is required.";

    const cleaned = cleanBlocks(content);
    if (cleaned.length === 0) {
      return "Add at least one paragraph or media block.";
    }

    const excerptValue =
      excerpt.trim() || deriveExcerpt(cleaned, title);
    if (excerptValue.length < 10) {
      return "Add an excerpt of at least 10 characters, or more article text.";
    }
    return null;
  };

  const buildPayload = (content: BlogBlock[]) => {
    const cleaned = cleanBlocks(content);
    return {
      title: title.trim(),
      slug: slugify(slug || title) || undefined,
      excerpt: excerpt.trim() || deriveExcerpt(cleaned, title),
      subtitle: subtitle.trim() || undefined,
      content: cleaned,
      category: categoryId,
      authorName: authorName.trim(),
      coverImage: coverImage.url
        ? {
            url: coverImage.url,
            publicId: coverImage.publicId,
            alt: coverImage.alt,
          }
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

  const saveArticle = async (): Promise<SavedArticle | null> => {
    const latest = getLatestBlocks();
    const content = cleanBlocks(latest);
    const validationError = validateContent(content);
    if (validationError) {
      setError(validationError);
      return null;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(
        postId ? `/api/admin/blogs/${postId}` : "/api/admin/blogs",
        {
          method: postId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload(content)),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Failed to save the article.");
        return null;
      }

      const saved = json.data?.post as AdminBlogDetailDTO | undefined;
      const savedId = saved?.id ?? postId;
      if (!savedId) {
        setError("The article was saved but its ID was missing.");
        return null;
      }

      setPostId(savedId);
      setBlocks(content);
      if (saved) {
        setStatus(saved.status);
        setSlug(saved.slug);
        setScheduledAt(saved.scheduledAt ?? null);
      }
      baselineRef.current = null;
      setSuccessMsg("Article saved.");
      return { id: savedId, blocks: content };
    } catch {
      setError("Unable to save the article. Please try again.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const created = !postId;
    const saved = await saveArticle();
    if (!saved) return;
    if (created) router.replace(`/admin/blogs/${saved.id}`);
  };

  const changeStatus = async (
    id: string,
    next: BlogStatus,
    scheduleIso?: string
  ): Promise<boolean> => {
    setStatusAction(next);
    setError(null);
    setSuccessMsg(null);
    try {
      const body: Record<string, unknown> = { status: next };
      if (next === "scheduled") body.scheduledAt = scheduleIso;
      const res = await fetch(`/api/admin/blogs/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Failed to update the status.");
        return false;
      }
      const updated = json.data?.post as AdminBlogDetailDTO | undefined;
      setStatus(updated?.status ?? next);
      if (typeof updated?.isFeatured === "boolean") {
        setIsFeatured(updated.isFeatured);
      }
      if (next === "scheduled") {
        setScheduledAt(scheduleIso ?? updated?.scheduledAt ?? null);
      } else {
        setScheduledAt(updated?.scheduledAt ?? null);
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
      router.refresh();
      return true;
    } catch {
      setError("Unable to update the status. Please try again.");
      return false;
    } finally {
      setStatusAction(null);
    }
  };

  const handlePublish = async () => {
    const created = !postId;
    const saved = await saveArticle();
    if (!saved) return;
    const ok = await changeStatus(saved.id, "published");
    if (ok && created) router.replace(`/admin/blogs/${saved.id}`);
  };

  const openScheduleDialog = () => {
    const base = scheduledAt
      ? new Date(scheduledAt)
      : new Date(Date.now() + 60 * 60 * 1000);
    setScheduleInput(toLocalInputValue(base.toISOString()));
    setScheduleError(null);
    setDialog("schedule");
  };

  const submitSchedule = async () => {
    if (!scheduleInput) {
      setScheduleError("Pick a date and time to schedule the article.");
      return;
    }
    const when = new Date(scheduleInput);
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      setScheduleError("Schedule time must be in the future.");
      return;
    }
    const created = !postId;
    const saved = await saveArticle();
    if (!saved) return;
    const ok = await changeStatus(saved.id, "scheduled", when.toISOString());
    if (ok) {
      setDialog(null);
      if (created) router.replace(`/admin/blogs/${saved.id}`);
    }
  };

  const handleToggleFeature = async () => {
    if (!postId) return;
    setTogglingFeature(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/blogs/${postId}/feature`, {
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
      router.refresh();
    } catch {
      setError("Unable to update the featured flag. Please try again.");
    } finally {
      setTogglingFeature(false);
    }
  };

  const handleEditorKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>
  ) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      void handleSave();
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/admin/blogs"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 transition hover:text-emerald-700"
          >
            <Undo2 className="h-4 w-4" />
            Back to articles
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
            {postId ? "Edit article" : "Write an article"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {title.trim()
              ? title
              : "A clean editor with safe embeds and responsive images."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDialog("preview")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          {postId && status === "published" && (
            <Link
              href={`/blogs/${slug || post?.slug || ""}`}
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
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving." : "Save"}
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

      {postId && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${STATUS_STYLES[status]}`}
            >
              {STATUS_LABELS[status]}
            </span>
            {status === "scheduled" && scheduledAt && (
              <span className="text-xs text-gray-500">
                Goes live {new Date(scheduledAt).toLocaleString("en-IN")}
              </span>
            )}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {status !== "published" && (
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={busy}
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
              {status !== "scheduled" && status !== "published" && (
                <button
                  type="button"
                  onClick={openScheduleDialog}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  Schedule
                </button>
              )}
              {status === "scheduled" && (
                <button
                  type="button"
                  onClick={openScheduleDialog}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  Reschedule
                </button>
              )}
              {status === "published" && (
                <button
                  type="button"
                  onClick={() => void changeStatus(postId, "archived")}
                  disabled={busy}
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
              {(status === "published" || status === "archived") && (
                <button
                  type="button"
                  onClick={() => void changeStatus(postId, "draft")}
                  disabled={busy}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Back to draft
                </button>
              )}
              {status === "published" && (
                <button
                  type="button"
                  onClick={handleToggleFeature}
                  disabled={togglingFeature || busy}
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
                      className={`h-3.5 w-3.5 ${
                        isFeatured ? "fill-amber-400" : ""
                      }`}
                    />
                  )}
                  {isFeatured ? "Featured" : "Feature"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="p-4 sm:p-6">
              <input
                type="text"
                value={title}
                onChange={(event) => handleTitleChange(event.target.value)}
                maxLength={180}
                placeholder="Article title"
                className="w-full border-none bg-transparent text-2xl font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none sm:text-3xl"
              />
              <input
                type="text"
                value={subtitle}
                onChange={(event) => setSubtitle(event.target.value)}
                maxLength={300}
                placeholder="Add a short subtitle (optional)"
                className="mt-2 w-full border-none bg-transparent text-base text-gray-600 placeholder:text-gray-300 focus:outline-none"
              />
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <Globe2 className="h-3.5 w-3.5" />
                  /blogs/{slug || slugify(title) || "your-article"}
                </span>
                <span>
                  {wordCount} word{wordCount === 1 ? "" : "s"}
                </span>
                <span>{readingTime} min read</span>
              </div>
            </div>

            <BlogEditorToolbar
              formatState={formatState}
              applyCommand={applyCommand}
              onAddImage={openImageDialog}
              onAddEmbed={() => {
                saveSelection();
                setDialog("embed");
              }}
              onAddLink={() => {
                saveSelection();
                setDialog("link");
              }}
              onAddLinkCard={() => {
                saveSelection();
                setDialog("linkCard");
              }}
            />

            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              aria-label="Article content"
              onInput={syncFromEditor}
              onKeyUp={refreshFormatState}
              onMouseUp={refreshFormatState}
              onFocus={refreshFormatState}
              onKeyDown={handleEditorKeyDown}
              onClick={handleRemoveMedia}
              onPaste={(event) => {
                event.preventDefault();
                const text = event.clipboardData.getData("text/plain");
                if (text) {
                  document.execCommand("insertText", false, text);
                  syncFromEditor();
                }
              }}
              className="blog-editor-surface min-h-[460px] px-4 py-5 text-gray-800 focus:outline-none sm:px-6"
            />
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Listing excerpt
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Used on cards and in search results.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setExcerpt(deriveExcerpt(blocks, title))
                }
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
              >
                Use content
              </button>
            </div>
            <textarea
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
              rows={3}
              maxLength={600}
              placeholder="Leave blank to generate a short excerpt from the article."
              className={`${inputClass} mt-3`}
            />
            <p className="mt-1 text-right text-xs text-gray-400">
              {effectiveExcerpt.trim().length}/600
            </p>
          </section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Details</h2>

            <label className={`${labelClass} mt-4`}>Category</label>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className={`${inputClass} mt-1.5`}
            >
              <option value="">Choose a category.</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {!category.isActive ? " (archived)" : ""}
                </option>
              ))}
            </select>

            <label className={`${labelClass} mt-4`}>Author name</label>
            <input
              type="text"
              value={authorName}
              onChange={(event) => setAuthorName(event.target.value)}
              maxLength={120}
              placeholder="e.g. Scrapi Team"
              className={`${inputClass} mt-1.5`}
            />

            <label className={`${labelClass} mt-4`}>
              Slug {slugTouched && <span className="normal-case">(manual)</span>}
            </label>
            <input
              type="text"
              value={slug}
              onChange={(event) => handleSlugChange(event.target.value)}
              maxLength={200}
              placeholder="auto-generated-from-title"
              className={`${inputClass} mt-1.5`}
            />
          </div>

          <ImageField
            label="Cover image"
            hint="Shown on cards and at the top of the article. JPG/PNG/WebP up to 5 MB."
            value={coverImage}
            uploading={uploadingKey === "cover"}
            onAltChange={(alt) =>
              setCoverImage((previous) => ({ ...previous, alt }))
            }
            onRemove={() => setCoverImage(EMPTY_IMAGE)}
            onPick={(file) => void uploadFieldImage("cover", file)}
          />

          <ImageField
            label="Social share image"
            hint="Optional. Used for WhatsApp and social previews. Falls back to the cover."
            value={socialImage}
            uploading={uploadingKey === "social"}
            onAltChange={(alt) =>
              setSocialImage((previous) => ({ ...previous, alt }))
            }
            onRemove={() => setSocialImage(EMPTY_IMAGE)}
            onPick={(file) => void uploadFieldImage("social", file)}
          />

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">
              Search metadata
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Optional. Falls back to the title and excerpt.
            </p>

            <label className={`${labelClass} mt-4`}>
              Meta title ({seoMetaTitle.length}/70)
            </label>
            <input
              type="text"
              value={seoMetaTitle}
              onChange={(event) => setSeoMetaTitle(event.target.value)}
              maxLength={70}
              className={`${inputClass} mt-1.5`}
            />

            <label className={`${labelClass} mt-4`}>
              Meta description ({seoMetaDescription.length}/180)
            </label>
            <textarea
              value={seoMetaDescription}
              onChange={(event) => setSeoMetaDescription(event.target.value)}
              rows={3}
              maxLength={180}
              className={`${inputClass} mt-1.5`}
            />
          </div>
        </aside>
      </div>

      {dialog === "image" && (
        <ImageDialog
          open
          busy={imageBusy}
          error={imageError}
          onClose={() => setDialog(null)}
          onInsert={(file, alt, caption) =>
            void handleInsertImage(file, alt, caption)
          }
        />
      )}

      {dialog === "embed" && (
        <EmbedDialog
          open
          onClose={() => setDialog(null)}
          onInsert={handleInsertEmbed}
        />
      )}

      {dialog === "link" && (
        <InlineLinkDialog
          open
          selectedText={selectedText}
          onClose={() => setDialog(null)}
          onInsert={handleInsertInlineLink}
        />
      )}

      {dialog === "linkCard" && (
        <LinkCardDialog
          open
          onClose={() => setDialog(null)}
          onInsert={handleInsertLinkCard}
        />
      )}

      <AdminModal
        open={dialog === "schedule"}
        onClose={() => setDialog(null)}
        title={
          status === "scheduled"
            ? "Reschedule article"
            : "Schedule article"
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            The article goes live automatically at the chosen time. No further
            manual action is needed.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Publication time
            </label>
            <input
              type="datetime-local"
              value={scheduleInput}
              onChange={(event) => {
                setScheduleInput(event.target.value);
                setScheduleError(null);
              }}
              className={inputClass}
            />
          </div>
          {scheduleError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {scheduleError}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDialog(null)}
              disabled={busy}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submitSchedule()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {statusAction === "scheduled" && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Schedule
            </button>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={dialog === "preview"}
        onClose={() => setDialog(null)}
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
              {categories.find((category) => category.id === categoryId)?.name ??
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

          {effectiveExcerpt.trim() && (
            <p className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm italic text-gray-600">
              {effectiveExcerpt}
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
