"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import RemoteImage from "@/components/common/RemoteImage";
import type { ImageValue } from "./helpers";

interface ImageFieldProps {
  label: string;
  hint: string;
  value: ImageValue;
  uploading: boolean;
  onAltChange: (alt: string) => void;
  onRemove: () => void;
  onPick: (file: File) => void;
}

export default function ImageField({
  label,
  hint,
  value,
  uploading,
  onAltChange,
  onRemove,
  onPick,
}: ImageFieldProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">{label}</h2>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">{hint}</p>

      <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
        {value.url ? (
          <RemoteImage
            src={value.url}
            alt={value.alt || `${label} preview`}
            loading="eager"
            className="aspect-[16/9] h-auto w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[16/9] items-center justify-center">
            <ImagePlus className="h-7 w-7 text-gray-300" />
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50">
          {uploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Uploading.
            </>
          ) : value.url ? (
            "Replace image"
          ) : (
            "Upload image"
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onPick(file);
            }}
          />
        </label>
        {value.url && !uploading && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-500 transition hover:bg-gray-50"
          >
            <X className="h-3.5 w-3.5" />
            Remove
          </button>
        )}
      </div>

      <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-gray-400">
        Alt text
      </label>
      <input
        type="text"
        value={value.alt}
        onChange={(event) => onAltChange(event.target.value)}
        maxLength={300}
        placeholder="Describe the image for accessibility"
        className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
    </div>
  );
}
