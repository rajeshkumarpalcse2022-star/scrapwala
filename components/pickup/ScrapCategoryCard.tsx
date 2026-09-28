"use client";

import { cn } from "@/lib/utils";
import { Boxes, Check } from "lucide-react";
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
  return (
    <button
      type="button"
      onClick={() => onToggle(category.id)}
      className={cn(
        "relative flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all",
        "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        isSelected
          ? "border-primary bg-primary-light"
          : "border-border bg-card hover:border-primary/30 hover:bg-card-hover"
      )}
      aria-pressed={isSelected}
      aria-label={`Select ${category.name}`}
    >
      {isSelected && (
        <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
          <Check className="h-3 w-3" aria-hidden="true" />
        </span>
      )}
      <div
        className={cn(
          "mb-3 flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg",
          isSelected ? "bg-primary/10" : "bg-muted-light"
        )}
      >
        {category.imageUrl ? (
          <RemoteImage
            src={category.imageUrl}
            alt={category.name}
            className="h-8 w-8 object-contain"
          />
        ) : (
          <Boxes
            className={cn(
              "h-5 w-5",
              isSelected ? "text-primary" : "text-muted"
            )}
            aria-hidden="true"
          />
        )}
      </div>
      <h3 className="font-semibold text-foreground">{category.name}</h3>
    </button>
  );
}
