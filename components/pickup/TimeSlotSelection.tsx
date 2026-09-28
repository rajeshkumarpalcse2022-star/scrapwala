"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Clock, Loader2 } from "lucide-react";
import type { TimeSlot } from "@/types/pickup";

interface TimeSlotSelectionProps {
  selectedSlot: TimeSlot | null;
  onNext: (slot: TimeSlot) => void;
  onBack: () => void;
}

function formatTime(t: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(t);
  if (!match) return t;
  const hours = Number(match[1]);
  const minutes = match[2];
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;
  return `${String(hour).padStart(2, "0")}:${minutes} ${suffix}`;
}

export default function TimeSlotSelection({
  selectedSlot,
  onNext,
  onBack,
}: TimeSlotSelectionProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selected, setSelected] = useState<TimeSlot | null>(selectedSlot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/time-slots", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to load time slots.");
        }
        const fetched: TimeSlot[] = json.data?.timeSlots ?? [];
        setSlots(fetched);
        setError("");
        // Keep the previous selection only if that slot still exists & is open.
        setSelected((prev) => {
          if (!prev) return null;
          const match = fetched.find((s) => s.id === prev.id);
          return match && match.availability !== "unavailable" ? match : null;
        });
      } catch (err) {
        if (cancelled) return;
        setSlots([]);
        setError(
          err instanceof Error ? err.message : "Unable to load time slots."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const handleContinue = () => {
    if (!selected) {
      setError("Please select a time slot.");
      return;
    }
    if (selected.availability === "unavailable") {
      setError("This time slot is unavailable. Please choose another.");
      return;
    }
    onNext(selected);
  };

  const availabilityStyles = {
    available: "border-primary/30 bg-card hover:border-primary",
    limited: "border-warning/30 bg-warning/5",
    unavailable: "border-border bg-muted-light opacity-60 cursor-not-allowed",
  };

  const availabilityLabels = {
    available: "Available",
    limited: "Limited Slots",
    unavailable: "Unavailable",
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground">Select Time Slot</h2>
      <p className="mt-2 text-muted">
        Choose a time window for the collector to visit.
      </p>

      {loading ? (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-8 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          Loading time slots…
        </div>
      ) : error && slots.length === 0 ? (
        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <p className="text-sm text-destructive">{error}</p>
          <button
            type="button"
            onClick={() => {
              setError("");
              setReloadKey((key) => key + 1);
            }}
            className="mt-3 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted-light"
          >
            Retry
          </button>
        </div>
      ) : slots.length === 0 ? (
        <div className="mt-6 rounded-xl border border-border bg-card p-8 text-center text-sm text-muted">
          No time slots are available right now. Please check again later.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {slots.map((slot) => {
            const isSelected = selected?.id === slot.id;
            const isUnavailable = slot.availability === "unavailable";
            const start = formatTime(slot.startTime);
            const end = formatTime(slot.endTime);

            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => {
                  if (!isUnavailable) {
                    setSelected(slot);
                    setError("");
                  }
                }}
                disabled={isUnavailable}
                className={cn(
                  "relative flex flex-col items-center rounded-xl border-2 p-5 text-center transition-all",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  availabilityStyles[slot.availability],
                  isSelected && "border-primary bg-primary-light ring-4 ring-primary/10",
                  isUnavailable && "cursor-not-allowed"
                )}
                aria-pressed={isSelected}
                aria-disabled={isUnavailable}
              >
                <Clock
                  className="mb-2 h-6 w-6 text-muted"
                  aria-hidden="true"
                />
                <span className="text-base font-semibold text-foreground">
                  {start}
                </span>
                <span className="text-sm text-muted">to</span>
                <span className="text-base font-semibold text-foreground">
                  {end}
                </span>
                <span
                  className={cn(
                    "mt-2 text-xs font-medium",
                    slot.availability === "available" && "text-primary",
                    slot.availability === "limited" && "text-warning",
                    slot.availability === "unavailable" && "text-muted"
                  )}
                >
                  {availabilityLabels[slot.availability]}
                </span>
                {isSelected && (
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {error && slots.length > 0 && (
        <p className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
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
          disabled={loading || slots.length === 0}
          className="rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
