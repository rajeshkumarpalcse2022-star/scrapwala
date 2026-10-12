"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import RemoteImage from "@/components/common/RemoteImage";
import type { PickupPhoto } from "@/types/pickup";
import {
  PICKUP_PHOTO_FORMAT_LABEL,
  PICKUP_PHOTO_MAX_BYTES,
  PICKUP_PHOTO_MAX_COUNT,
  PICKUP_PHOTO_MAX_MB,
  PICKUP_PHOTO_MIME_TYPES,
} from "@/lib/constants/pickup";

interface PhotoUploadProps {
  photos: PickupPhoto[];
  /** Stable per-booking-form id; the server caps photos per session. */
  uploadSessionId: string;
  onChange: (photos: PickupPhoto[]) => void;
}

type UploadStatus = "uploading" | "done" | "error";

interface UploadEntry {
  localId: string;
  url: string;
  publicId: string;
  previewUrl: string;
  status: UploadStatus;
  progress: number;
  fileName: string;
  fileSize: number;
  error?: string;
}

function pickDone(entries: UploadEntry[]): PickupPhoto[] {
  return entries
    .filter((e) => e.status === "done" && e.url && e.publicId)
    .map((e) => ({ url: e.url, publicId: e.publicId }));
}

function validateFile(file: File): string | null {
  if (file.size <= 0) {
    return `${file.name || "File"} is empty.`;
  }
  if (!(PICKUP_PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
    return `${file.name}: only ${PICKUP_PHOTO_FORMAT_LABEL} images are allowed.`;
  }
  if (file.size > PICKUP_PHOTO_MAX_BYTES) {
    return `${file.name}: each photo must be smaller than ${PICKUP_PHOTO_MAX_MB} MB.`;
  }
  return null;
}

function newLocalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `photo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function PhotoUpload({
  photos,
  uploadSessionId,
  onChange,
}: PhotoUploadProps) {
  const [entries, setEntries] = useState<UploadEntry[]>(() =>
    photos.map((p, index) => ({
      localId: `restored-${index}`,
      url: p.url,
      publicId: p.publicId,
      previewUrl: p.url,
      status: "done" as const,
      progress: 100,
      fileName: p.publicId,
      fileSize: 0,
    }))
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const xhrsRef = useRef<Map<string, XMLHttpRequest>>(new Map());
  const onChangeRef = useRef(onChange);
  const skipSyncRef = useRef(true);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Push completed uploads up to the pickup form state (parent persists
  // them across steps). Skipped on mount: the parent already owns them.
  useEffect(() => {
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }
    onChangeRef.current(pickDone(entries));
  }, [entries]);

  useEffect(() => {
    const active = xhrsRef.current;
    return () => {
      active.forEach((xhr) => xhr.abort());
    };
  }, []);

  const uploadFile = (file: File, localId: string) => {
    const xhr = new XMLHttpRequest();
    xhrsRef.current.set(localId, xhr);

    const updateEntry = (patch: Partial<UploadEntry>) => {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.localId === localId ? { ...entry, ...patch } : entry
        )
      );
    };

    xhr.open("POST", "/api/pickup-photos");
    xhr.responseType = "text";

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        updateEntry({ progress: Math.round((event.loaded / event.total) * 100) });
      }
    };

    xhr.onload = () => {
      xhrsRef.current.delete(localId);
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && json.success && json.data?.url) {
          updateEntry({
            status: "done",
            progress: 100,
            url: json.data.url,
            publicId: json.data.publicId,
            previewUrl: json.data.url,
            error: undefined,
          });
        } else {
          updateEntry({
            status: "error",
            error: json.message || "Upload failed. Please try again.",
          });
        }
      } catch {
        updateEntry({ status: "error", error: "Upload failed. Please try again." });
      }
    };

    xhr.onerror = () => {
      xhrsRef.current.delete(localId);
      updateEntry({ status: "error", error: "Network error — upload failed." });
    };

    xhr.onabort = () => {
      xhrsRef.current.delete(localId);
    };

    const formData = new FormData();
    formData.append("file", file);
    formData.append("uploadSessionId", uploadSessionId);
    xhr.send(formData);
  };

  const handleFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setFormError(null);
    const errors: string[] = [];
    let next = [...entries];

    for (const file of files) {
      const activeCount = next.filter(
        (e) => e.status === "done" || e.status === "uploading"
      ).length;
      if (activeCount >= PICKUP_PHOTO_MAX_COUNT) {
        errors.push(`You can upload up to ${PICKUP_PHOTO_MAX_COUNT} photos per pickup.`);
        break;
      }

      const validationError = validateFile(file);
      if (validationError) {
        errors.push(validationError);
        continue;
      }

      const duplicate = next.some(
        (e) => e.fileName === file.name && e.fileSize === file.size
      );
      if (duplicate) {
        errors.push(`${file.name} is already added.`);
        continue;
      }

      const localId = newLocalId();
      next = [
        ...next,
        {
          localId,
          url: "",
          publicId: "",
          previewUrl: URL.createObjectURL(file),
          status: "uploading" as const,
          progress: 0,
          fileName: file.name,
          fileSize: file.size,
        },
      ];
      uploadFile(file, localId);
    }

    setEntries(next);
    if (errors.length > 0) {
      setFormError(errors.join(" "));
    }
  };

  const removeEntry = (localId: string) => {
    const target = entries.find((e) => e.localId === localId);
    if (!target) return;

    const xhr = xhrsRef.current.get(localId);
    if (xhr) {
      xhr.abort();
      xhrsRef.current.delete(localId);
    }
    if (target.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(target.previewUrl);
    }
    if (target.status === "done" && target.publicId) {
      // Best-effort Cloudinary cleanup for a photo removed before booking.
      fetch("/api/pickup-photos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId: target.publicId }),
      }).catch(() => undefined);
    }

    setEntries((prev) => prev.filter((e) => e.localId !== localId));
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleFiles(event.target.files);
    }
    event.target.value = "";
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload scrap photos"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          isDragging
            ? "border-primary bg-primary-light"
            : "border-border bg-muted-light hover:border-primary/40 hover:bg-card-hover"
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <ImagePlus className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
        <p className="mt-3 text-sm font-semibold text-foreground">
          Upload Scrap Photos
        </p>
        <p className="mt-1 text-xs text-muted">
          Add one or more photos of your scrap
        </p>
        <span className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">
          Choose Images
        </span>
        <p className="mt-3 text-xs text-muted">
          {PICKUP_PHOTO_FORMAT_LABEL} · up to {PICKUP_PHOTO_MAX_MB} MB each ·
          max {PICKUP_PHOTO_MAX_COUNT} photos
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={PICKUP_PHOTO_MIME_TYPES.join(",")}
          multiple
          onChange={handleInputChange}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {formError && (
        <p
          className="mt-3 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {formError}
        </p>
      )}

      {entries.length > 0 && (
        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {entries.map((entry) => (
            <li
              key={entry.localId}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted-light"
            >
              <RemoteImage
                src={entry.previewUrl}
                alt={entry.fileName || "Scrap photo preview"}
                className="h-full w-full object-cover"
                loading="eager"
              />

              {entry.status === "uploading" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  <span className="mt-1 text-xs font-medium">
                    {entry.progress}%
                  </span>
                </div>
              )}

              {entry.status === "error" && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/80 px-2 text-center text-white"
                  title={entry.error}
                >
                  <span className="text-[10px] leading-tight">
                    {entry.error ?? "Upload failed"}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeEntry(entry.localId);
                }}
                aria-label={`Remove photo ${entry.fileName}`}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
