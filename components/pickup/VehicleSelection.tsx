"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import RemoteImage from "@/components/common/RemoteImage";
import { cn } from "@/lib/utils";
import { VEHICLE_OPTIONS } from "@/lib/constants/pickup";
import type { SelectedVehicle, VehicleId } from "@/types/pickup";

interface VehicleSelectionProps {
  selected: SelectedVehicle | null;
  onNext: (vehicle: SelectedVehicle) => void;
}

const vehicleImages: Record<VehicleId, string> = {
  small: "/images/vehicle-small.jpg",
  large: "/images/vehicle-large.jpg",
};

const vehicleDescriptions: Record<VehicleId, string> = {
  small: "Quick trips for lighter loads — bags and small bundles.",
  large: "Bigger pickups for bulky or heavy scrap items.",
};

export default function VehicleSelection({
  selected,
  onNext,
}: VehicleSelectionProps) {
  const [choice, setChoice] = useState<VehicleId | null>(selected?.id ?? null);
  const [error, setError] = useState("");

  const handleContinue = () => {
    const option = VEHICLE_OPTIONS.find((v) => v.id === choice);
    if (!option) {
      setError("Please select a vehicle to continue.");
      return;
    }
    onNext({ id: option.id, name: option.name, label: option.label });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground">Select Vehicle</h2>
      <p className="mt-2 text-muted">
        Choose the vehicle that fits your scrap pickup.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {VEHICLE_OPTIONS.map((option) => {
          const isSelected = choice === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setChoice(option.id);
                setError("");
              }}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all",
                "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                isSelected
                  ? "border-primary bg-primary-light"
                  : "border-border bg-card hover:border-primary/30 hover:bg-card-hover"
              )}
              aria-pressed={isSelected}
              aria-label={`Select ${option.name} vehicle, ${option.label}`}
            >
              <RemoteImage
                src={vehicleImages[option.id]}
                alt=""
                className="aspect-[3/1] w-full object-cover"
                loading="lazy"
              />

              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">
                    {option.name}
                  </h3>
                  <span className="rounded-full bg-muted-light px-2 py-0.5 text-xs font-medium text-muted">
                    {option.label}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {vehicleDescriptions[option.id]}
                </p>
              </div>

              {isSelected && (
                <span className="absolute right-3 top-3 h-3 w-3 rounded-full bg-primary ring-4 ring-primary/20" />
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <p
          className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={handleContinue}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Continue
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
