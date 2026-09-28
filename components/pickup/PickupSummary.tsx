"use client";

import type {
  PickupAddress,
  PickupDate,
  ScrapRate,
  SelectedVehicle,
  TimeSlot,
} from "@/types/pickup";
import { formatRate } from "@/components/pickup/RateStep";
import {
  MapPin,
  Calendar,
  Clock,
  User,
  Phone,
  Edit,
  Info,
  Loader2,
  Truck,
  Weight,
  Tag,
} from "lucide-react";

interface PickupSummaryProps {
  vehicle: SelectedVehicle;
  selectedScrap: string[];
  itemNames: Record<string, string>;
  address: PickupAddress;
  expectedWeight: string;
  rates: ScrapRate[];
  pickupDate: PickupDate;
  timeSlot: TimeSlot;
  onEditVehicle: () => void;
  onEditLocation: () => void;
  onEditScrap: () => void;
  onEditWeight: () => void;
  onEditRates: () => void;
  onEditDateTime: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  error?: string | null;
}

function EditButton({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-dark focus:outline-none focus:underline disabled:opacity-50"
    >
      <Edit className="h-3.5 w-3.5" aria-hidden="true" />
      Edit {label}
    </button>
  );
}

export default function PickupSummary({
  vehicle,
  selectedScrap,
  itemNames,
  address,
  expectedWeight,
  rates,
  pickupDate,
  timeSlot,
  onEditVehicle,
  onEditLocation,
  onEditScrap,
  onEditWeight,
  onEditRates,
  onEditDateTime,
  onConfirm,
  isSubmitting = false,
  error,
}: PickupSummaryProps) {
  const scrapNames = selectedScrap
    .map((id) => itemNames[id])
    .filter((name): name is string => Boolean(name));

  const rateBySub = new Map(rates.map((r) => [r.subcategoryId, r]));

  const formatDateFull = (date: Date) => {
    return date.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatSlot = (slot: TimeSlot) => {
    if (slot.label) return slot.label;
    return `${slot.startTime} - ${slot.endTime}`;
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground">Review & Confirm</h2>
      <p className="mt-2 text-muted">
        Please review your booking details before confirming.
      </p>

      <div className="mt-6 space-y-4">
        {/* Vehicle */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Vehicle</h3>
            <EditButton
              onClick={onEditVehicle}
              disabled={isSubmitting}
              label="vehicle"
            />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light">
              <Truck className="h-4 w-4 text-primary" aria-hidden="true" />
            </span>
            <div className="text-sm">
              <p className="font-medium text-foreground">{vehicle.name}</p>
              <p className="text-muted">{vehicle.label}</p>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Pickup Location</h3>
            <EditButton
              onClick={onEditLocation}
              disabled={isSubmitting}
              label="location"
            />
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-start gap-2 text-sm text-muted">
              <User className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{address.fullName}</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-muted">
              <Phone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{address.phone}</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-muted">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {address.houseFlatBuilding}, {address.streetArea}
                {address.landmark && `, ${address.landmark}`},{" "}
                {address.city}, {address.state} - {address.pinCode}
              </span>
            </div>
            {typeof address.latitude === "number" &&
              typeof address.longitude === "number" && (
                <div className="flex items-start gap-2 text-sm text-muted">
                  <span className="w-4 shrink-0 text-center text-xs text-primary">
                    ●
                  </span>
                  <span>
                    Map pin: {address.latitude.toFixed(5)},{" "}
                    {address.longitude.toFixed(5)}
                  </span>
                </div>
              )}
          </div>
        </div>

        {/* Scrap Items */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Scrap Items</h3>
            <EditButton
              onClick={onEditScrap}
              disabled={isSubmitting}
              label="scrap"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {scrapNames.map((name) => (
              <span
                key={name}
                className="rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-primary"
              >
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* Weight */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Expected Weight</h3>
            <EditButton
              onClick={onEditWeight}
              disabled={isSubmitting}
              label="weight"
            />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light">
              <Weight className="h-4 w-4 text-primary" aria-hidden="true" />
            </span>
            <span className="text-sm font-medium text-foreground">
              {expectedWeight}
            </span>
          </div>
        </div>

        {/* Rates */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Expected Rates</h3>
            <EditButton
              onClick={onEditRates}
              disabled={isSubmitting}
              label="rates"
            />
          </div>
          <div className="mt-3 space-y-2">
            {selectedScrap.map((id) => {
              const rate = rateBySub.get(id);
              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2 text-muted">
                    <Tag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{itemNames[id] ?? "Unknown"}</span>
                  </span>
                  <span className="shrink-0 font-medium text-foreground">
                    {rate ? formatRate(rate) : "Rate not set yet"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Date & Time */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Date & Time</h3>
            <EditButton
              onClick={onEditDateTime}
              disabled={isSubmitting}
              label="schedule"
            />
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Calendar className="h-4 w-4" aria-hidden="true" />
              <span>{formatDateFull(pickupDate.date)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted">
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span>{formatSlot(timeSlot)}</span>
            </div>
          </div>
        </div>

        {/* Estimated Amount */}
        <div className="rounded-xl border border-primary/30 bg-primary-light p-5">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <h3 className="font-semibold text-primary">Final Amount</h3>
              <p className="mt-1 text-sm text-muted">
                Final amount will be calculated after weighing the scrap at
                pickup. The amount depends on collected quantity and applicable
                scrap rates.
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      <div className="mt-8 flex items-center justify-end">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Booking...
            </>
          ) : (
            "Confirm Pickup"
          )}
        </button>
      </div>
    </div>
  );
}
