"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Calendar, CalendarDays } from "lucide-react";
import type { PickupDate } from "@/types/pickup";

interface DateSelectionProps {
  selectedDate: PickupDate | null;
  onNext: (date: PickupDate) => void;
  onBack: () => void;
}

function toInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function DateSelection({
  selectedDate,
  onNext,
  onBack,
}: DateSelectionProps) {
  const [selected, setSelected] = useState<PickupDate | null>(selectedDate);
  const [error, setError] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);

  const { dates, today, maxDate } = useMemo(() => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const max = new Date(todayDate);
    max.setDate(max.getDate() + 30);

    const result: PickupDate[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(todayDate);
      date.setDate(todayDate.getDate() + i);

      let label: string;
      if (i === 0) {
        label = "Today";
      } else if (i === 1) {
        label = "Tomorrow";
      } else {
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        label = `${dayNames[date.getDay()]} ${date.getDate()}`;
      }

      result.push({ date, label });
    }

    return { dates: result, today: todayDate, maxDate: max };
  }, []);

  const handleContinue = () => {
    if (!selected) {
      setError("Please select a pickup date.");
      return;
    }
    onNext(selected);
  };

  const handleCalendarPick = (value: string) => {
    if (!value) return;
    const picked = new Date(`${value}T00:00:00`);
    if (Number.isNaN(picked.getTime()) || picked < today) {
      setError("Please select today or a future date.");
      return;
    }
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    setSelected({
      date: picked,
      label: `${dayNames[picked.getDay()]} ${picked.getDate()}`,
    });
    setError("");
  };

  const formatDateFull = (date: Date) => {
    return date.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const monthLabel = (selected?.date ?? dates[0].date).toLocaleDateString(
    "en-IN",
    { month: "long", year: "numeric" }
  );

  const isDateSelected = (dateItem: PickupDate) =>
    selected?.date.toDateString() === dateItem.date.toDateString();

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground">Select Pickup Date</h2>
      <p className="mt-2 text-muted">
        Choose a convenient date for your pickup.
      </p>

      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
          {monthLabel}
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {dates.map((dateItem) => {
            const isSelected = isDateSelected(dateItem);
            const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const dayName = dayNames[dateItem.date.getDay()];
            const dayNum = dateItem.date.getDate();

            return (
              <button
                key={dateItem.date.toDateString()}
                type="button"
                onClick={() => {
                  setSelected(dateItem);
                  setError("");
                }}
                className={cn(
                  "flex flex-col items-center rounded-xl border-2 p-3 transition-all",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  isSelected
                    ? "border-primary bg-primary-light"
                    : "border-border bg-card hover:border-primary/30"
                )}
                aria-pressed={isSelected}
              >
                <span
                  className={cn(
                    "text-xs font-medium",
                    isSelected ? "text-primary" : "text-muted"
                  )}
                >
                  {dayName}
                </span>
                <span
                  className={cn(
                    "mt-1 text-lg font-bold",
                    isSelected ? "text-primary" : "text-foreground"
                  )}
                >
                  {dayNum}
                </span>
                <span
                  className={cn(
                    "text-xs",
                    isSelected ? "text-primary" : "text-muted"
                  )}
                >
                  {dateItem.label}
                </span>
              </button>
            );
          })}

          {/* More dates — native calendar for beyond the next 7 days */}
          <button
            type="button"
            onClick={() => setShowCalendar((v) => !v)}
            className={cn(
              "flex flex-col items-center rounded-xl border-2 p-3 transition-all",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              showCalendar
                ? "border-primary bg-primary-light"
                : "border-border bg-card hover:border-primary/30"
            )}
            aria-expanded={showCalendar}
            aria-label="Pick another date from calendar"
          >
            <CalendarDays
              className={cn(
                "h-5 w-5",
                showCalendar ? "text-primary" : "text-muted"
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "mt-1 text-xs font-medium",
                showCalendar ? "text-primary" : "text-muted"
              )}
            >
              More
            </span>
          </button>
        </div>

        {showCalendar && (
          <div className="mt-4 flex flex-col gap-2 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <label
              htmlFor="pickup-calendar"
              className="text-sm font-medium text-foreground"
            >
              Pick any date up to the next 30 days
            </label>
            <input
              id="pickup-calendar"
              type="date"
              min={toInputValue(today)}
              max={toInputValue(maxDate)}
              value={selected ? toInputValue(selected.date) : ""}
              onChange={(e) => handleCalendarPick(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}
      </div>

      {selected && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary-light p-3 text-sm text-primary">
          <Calendar className="h-4 w-4" aria-hidden="true" />
          <span>
            Selected: <strong>{formatDateFull(selected.date)}</strong>
          </span>
        </div>
      )}

      {error && (
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
          className="rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
