"use client";

import { useState } from "react";
import { Weight } from "lucide-react";
import { cn } from "@/lib/utils";
import { WEIGHT_RANGES } from "@/lib/constants/pickup";
import PhotoUpload from "./PhotoUpload";
import type { PickupPhoto } from "@/types/pickup";

interface WeightSelectionProps {
  selected: string | null;
  photos: PickupPhoto[];
  uploadSessionId: string;
  onPhotosChange: (photos: PickupPhoto[]) => void;
  onNext: (weightRange: string) => void;
  onBack: () => void;
}

export default function WeightSelection({
  selected,
  photos,
  uploadSessionId,
  onPhotosChange,
  onNext,
  onBack,
}: WeightSelectionProps) {
  const [choice, setChoice] = useState<string | null>(selected);
  const [error, setError] = useState("");

  const handleContinue = () => {
    if (!choice) {
      setError("Please select an expected weight range.");
      return;
    }
    if (photos.length === 0) {
      setError("Please upload at least one photo of your scrap.");
      return;
    }
    onNext(choice);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground">Expected Weight</h2>
      <p className="mt-2 text-muted">
        Roughly how much scrap are you expecting to hand over?
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {WEIGHT_RANGES.map((range) => {
          const isSelected = choice === range.label;

          return (
            <button
              key={range.id}
              type="button"
              onClick={() => {
                setChoice(range.label);
                setError("");
              }}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                isSelected
                  ? "border-primary bg-primary-light"
                  : "border-border bg-card hover:border-primary/30"
              )}
              aria-pressed={isSelected}
              aria-label={`Select weight range ${range.label}`}
            >
              <Weight
                className={cn(
                  "h-5 w-5",
                  isSelected ? "text-primary" : "text-muted"
                )}
                aria-hidden="true"
              />
              <span
                className={cn(
                  "text-sm font-semibold",
                  isSelected ? "text-primary" : "text-foreground"
                )}
              >
                {range.label}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted">
        Exact weight is measured at pickup during weighing.
      </p>

      <div className="mt-8">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-foreground">Upload Scrap Photos</h3>
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
            Required
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">
          Upload photos of the scrap you want to sell. This helps our team
          understand the materials before pickup.
        </p>
        <div className="mt-3">
          <PhotoUpload
            photos={photos}
            uploadSessionId={uploadSessionId}
            onChange={onPhotosChange}
          />
        </div>
        <p className="mt-3 text-xs text-muted">
          At least one photo is required. Uploading more helps our team
          prepare for your pickup.
        </p>
      </div>

      {error && (
        <p
          className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          className="rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
