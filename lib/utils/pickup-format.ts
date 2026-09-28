import { PICKUP_STATUS_LABELS } from "@/lib/constants/pickup";

/** "09:00" -> "09:00 AM" (12-hour, matches existing UI formatting). */
export function formatTime12(t: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(t);
  if (!match) return t;
  const hours = Number(match[1]);
  const minutes = match[2];
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;
  return `${String(hour).padStart(2, "0")}:${minutes} ${suffix}`;
}

/** "2026-09-28T18:30:00.000Z" -> "28 Sep 2026" (viewer timezone). */
export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** "2026-09-28T18:30:00.000Z" -> "Monday, 28 September 2026". */
export function formatDateFull(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export interface StatusBadge {
  label: string;
  className: string;
}

/** Badge styling per real status: active / completed / cancelled. */
export function getStatusBadge(status: string): StatusBadge {
  const label = PICKUP_STATUS_LABELS[status] ?? status;
  if (status === "completed") {
    return { label, className: "border-primary bg-primary text-white" };
  }
  if (status === "cancelled") {
    return {
      label,
      className: "border-destructive/30 bg-destructive/10 text-destructive",
    };
  }
  return {
    label,
    className: "border-primary/30 bg-primary-light text-primary",
  };
}
