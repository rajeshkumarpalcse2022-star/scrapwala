"use client";

import { useState } from "react";
import { Check, Recycle } from "lucide-react";
import { cn } from "@/lib/utils";
import RemoteImage from "@/components/common/RemoteImage";
import type { ScrapSubcategoryOption } from "@/types/pickup";

interface ScrapCategoryCardProps {
  category: ScrapSubcategoryOption;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

export default function ScrapCategoryCard({
  category,
  isSelected,
  onToggle,
}: ScrapCategoryCardProps) {
  const [imageBroken, setImageBroken] = useState(false);

  const description = category.description?.trim();
  const showImage = Boolean(category.imageUrl) && !imageBroken;

  return (
    <button
      type="button"
      onClick={() => onToggle(category.id)}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border-2 bg-card p-2.5 text-left",
        "transition-[border-color,background-color,box-shadow,transform] duration-200 ease-out motion-reduce:transition-none",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md motion-reduce:hover:translate-y-0",
        "active:scale-[0.98] motion-reduce:active:scale-100",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        isSelected
          ? "border-primary bg-primary-light shadow-sm"
          : "border-border"
      )}
      aria-pressed={isSelected}
      aria-label={
        isSelected ? `Deselect ${category.name}` : `Select ${category.name}`
      }
    >
      <div
        className={cn(
          "relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl transition-colors duration-200 ease-out motion-reduce:transition-none",
          isSelected
            ? "bg-primary/10"
            : "bg-muted-light group-hover:bg-card-hover"
        )}
      >
        {showImage ? (
          <RemoteImage
            src={category.imageUrl as string}
            alt={category.name}
            className="h-full w-full object-contain p-3 transition-transform duration-300 ease-out group-hover:scale-105 motion-reduce:group-hover:scale-100"
            onError={() => setImageBroken(true)}
          />
        ) : (
          <Recycle
            className="h-10 w-10 text-primary/30"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        )}

        <span
          aria-hidden="true"
          className={cn(
            "absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full shadow-sm",
            "transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
            isSelected
              ? "scale-100 bg-primary text-white opacity-100"
              : "scale-75 bg-white/90 text-primary opacity-0"
          )}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      </div>

      <div className="flex flex-1 flex-col px-1 pb-0.5 pt-2.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {category.name}
        </h3>
        {description && (
          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted">
            {description}
          </p>
        )}
      </div>
    </button>
  );
}
