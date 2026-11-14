"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Link2, Loader2, Video } from "lucide-react";
import AdminModal from "@/components/admin/AdminModal";
import { sanitizeHref } from "@/lib/utils/blog-content";
import {
  SOCIAL_EMBED_PROVIDER_LABELS,
  parseSocialEmbed,
} from "@/lib/utils/social-embeds";
import { hostnameOf } from "./helpers";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";
const labelClass =
  "block text-xs font-semibold uppercase tracking-wide text-gray-400";
const primaryButtonClass =
  "inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass =
  "rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50";

function DialogError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
      {message}
    </p>
  );
}

interface ImageDialogProps {
  open: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onInsert: (file: File, alt: string, caption: string) => void;
}

export function ImageDialog({
  open,
  busy,
  error,
  onClose,
  onInsert,
}: ImageDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const previewUrlRef = useRef("");

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const selectFile = (selected: File | null) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    const nextPreview = selected ? URL.createObjectURL(selected) : "";
    previewUrlRef.current = nextPreview;
    setFile(selected);
    setPreviewUrl(nextPreview);
    setLocalError(null);
  };

  const submit = () => {
    if (!file) {
      setLocalError("Choose a JPG, PNG or WebP image to upload.");
      return;
    }
    setLocalError(null);
    onInsert(file, alt.trim(), caption.trim());
  };

  return (
    <AdminModal open={open} onClose={onClose} title="Insert image">
      <div className="space-y-4">
        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Selected image preview"
              className="mx-auto max-h-52 rounded-lg object-contain"
            />
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-2 py-6 text-center">
              <ImagePlus className="h-7 w-7 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                Choose an image
              </span>
              <span className="text-xs text-gray-400">
                JPG, PNG or WebP up to 5 MB
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={busy}
                onChange={(event) => {
                  const selected = event.target.files?.[0] ?? null;
                  event.target.value = "";
                  selectFile(selected);
                }}
              />
            </label>
          )}
          {previewUrl && (
            <label className="mt-3 flex cursor-pointer items-center justify-center text-xs font-medium text-emerald-700 hover:text-emerald-800">
              Replace image
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={busy}
                onChange={(event) => {
                  const selected = event.target.files?.[0] ?? null;
                  event.target.value = "";
                  selectFile(selected);
                }}
              />
            </label>
          )}
        </div>

        <div>
          <label className={labelClass}>Alt text</label>
          <input
            type="text"
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
            maxLength={300}
            placeholder="Describe the image for screen readers"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Caption (optional)</label>
          <input
            type="text"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            maxLength={300}
            placeholder="Shown below the image"
            className={inputClass}
          />
        </div>

        <DialogError message={error ?? localError} />

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={secondaryButtonClass}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className={primaryButtonClass}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Uploading." : "Insert image"}
          </button>
        </div>
      </div>
    </AdminModal>
  );
}

interface EmbedDialogProps {
  open: boolean;
  onClose: () => void;
  onInsert: (url: string, title: string) => void;
}

export function EmbedDialog({ open, onClose, onInsert }: EmbedDialogProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const parsed = useMemo(() => parseSocialEmbed(url), [url]);

  const submit = () => {
    if (!parsed) {
      setError(
        "Paste a supported YouTube, Facebook, Instagram or Vimeo post/video link."
      );
      return;
    }
    setError(null);
    onInsert(url, title.trim());
  };

  return (
    <AdminModal open={open} onClose={onClose} title="Embed a social post">
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Post or video URL</label>
          <input
            type="url"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setError(null);
            }}
            placeholder="https://www.youtube.com/watch?v=..."
            className={inputClass}
            autoFocus
          />
          <p className="mt-1.5 text-xs text-gray-500">
            Supported: YouTube and Shorts, Facebook posts and videos,
            Instagram posts and reels, Vimeo.
          </p>
        </div>

        {url.trim() && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              parsed
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {parsed ? (
              <>
                <span className="inline-flex items-center gap-2 font-medium">
                  <Video className="h-4 w-4" />
                  {SOCIAL_EMBED_PROVIDER_LABELS[parsed.provider]} detected
                </span>
                <p className="mt-1 text-xs opacity-80">
                  A responsive, lazy-loaded player will be shown on the
                  published page.
                </p>
              </>
            ) : (
              <span>
                This link is not supported. It will not be embedded for safety.
              </span>
            )}
          </div>
        )}

        <div>
          <label className={labelClass}>Title (optional)</label>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            placeholder="e.g. Watch our recycling process"
            className={inputClass}
          />
        </div>

        <DialogError message={error} />

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!parsed}
            className={primaryButtonClass}
          >
            <Video className="h-4 w-4" />
            Insert embed
          </button>
        </div>
      </div>
    </AdminModal>
  );
}

interface InlineLinkDialogProps {
  open: boolean;
  selectedText: string;
  onClose: () => void;
  onInsert: (url: string, text: string, replaceSelection: boolean) => void;
}

export function InlineLinkDialog({
  open,
  selectedText,
  onClose,
  onInsert,
}: InlineLinkDialogProps) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState(selectedText);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const safeUrl = sanitizeHref(url.trim());
    if (!safeUrl || !/^https?:\/\//i.test(safeUrl)) {
      setError("Enter a valid http(s) link.");
      return;
    }
    if (!selectedText && !text.trim()) {
      setError("Enter the text to display for this link.");
      return;
    }
    setError(null);
    onInsert(
      safeUrl,
      selectedText ? selectedText : text.trim(),
      Boolean(selectedText)
    );
  };

  return (
    <AdminModal open={open} onClose={onClose} title="Add link">
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Link URL</label>
          <input
            type="url"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setError(null);
            }}
            placeholder="https://example.com"
            className={inputClass}
            autoFocus
          />
        </div>

        {selectedText ? (
          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Linking selected text: <strong>{selectedText}</strong>
          </div>
        ) : (
          <div>
            <label className={labelClass}>Display text</label>
            <input
              type="text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={300}
              placeholder="Read the full report"
              className={inputClass}
            />
          </div>
        )}

        <DialogError message={error} />

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Cancel
          </button>
          <button type="button" onClick={submit} className={primaryButtonClass}>
            <Link2 className="h-4 w-4" />
            Add link
          </button>
        </div>
      </div>
    </AdminModal>
  );
}

interface LinkCardDialogProps {
  open: boolean;
  onClose: () => void;
  onInsert: (url: string, title: string, description: string) => void;
}

export function LinkCardDialog({
  open,
  onClose,
  onInsert,
}: LinkCardDialogProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [titleTouched, setTitleTouched] = useState(false);
  const hostname = useMemo(() => hostnameOf(url.trim()), [url]);

  const submit = () => {
    const safeUrl = sanitizeHref(url.trim());
    if (!safeUrl || !/^https?:\/\//i.test(safeUrl)) {
      setError("Enter a valid http(s) link.");
      return;
    }
    setError(null);
    onInsert(safeUrl, title.trim() || hostname, description.trim());
  };

  return (
    <AdminModal open={open} onClose={onClose} title="Add external link card">
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Destination URL</label>
          <input
            type="url"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setError(null);
            }}
            placeholder="https://example.com/article"
            className={inputClass}
            autoFocus
          />
        </div>

        <div>
          <label className={labelClass}>Card title</label>
          <input
            type="text"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setTitleTouched(true);
            }}
            onBlur={() => {
              if (!titleTouched && hostname) setTitle(hostname);
            }}
            maxLength={200}
            placeholder="Defaults to the website name"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Short description (optional)</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Why is this link useful to readers?"
            className={inputClass}
          />
        </div>

        <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
          Shown as a clean link card. The destination opens in a new tab with
          rel=&quot;noopener noreferrer&quot;.
        </p>

        <DialogError message={error} />

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Cancel
          </button>
          <button type="button" onClick={submit} className={primaryButtonClass}>
            <Link2 className="h-4 w-4" />
            Insert link card
          </button>
        </div>
      </div>
    </AdminModal>
  );
}
