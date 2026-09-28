"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { TIMELINE_STAGES, reachedIndexFor } from "@/lib/constants/pickup";

interface PickupTimelineProps {
  /** Real Pickup.status from the database. */
  status: string;
  className?: string;
}

/**
 * Shared pickup status timeline (success screen + tracking page).
 * Driven purely by the real Pickup.status — no frontend-only states.
 * Subtle one-shot pop animation on the active step when status changes.
 */
export default function PickupTimeline({
  status,
  className,
}: PickupTimelineProps) {
  const reachedIndex = reachedIndexFor(status);
  const isCancelled = status === "cancelled";

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5",
        className
      )}
    >
      <p className="text-sm font-medium text-foreground">Pickup Timeline</p>

      {isCancelled ? (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          This pickup was cancelled.
        </p>
      ) : (
        /* key = reachedIndex → the active dot replays its pop animation
           whenever the pickup progresses (page/navigation refresh). */
        <ol key={reachedIndex} className="mt-3 space-y-0">
          {TIMELINE_STAGES.map((stage, index) => {
            const isDone = index < reachedIndex;
            const isCurrent = index === reachedIndex;
            const isLast = index === TIMELINE_STAGES.length - 1;

            return (
              <li key={stage} className="relative flex gap-3 pb-4 last:pb-0">
                {!isLast && (
                  <span
                    className={cn(
                      "absolute left-[7px] top-4 h-full w-0.5 transition-colors duration-500",
                      index < reachedIndex ? "bg-primary" : "bg-border"
                    )}
                    aria-hidden="true"
                  />
                )}
                <span
                  className={cn(
                    "relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300",
                    isDone && "border-primary bg-primary",
                    isCurrent &&
                      "timeline-active-dot border-primary bg-primary ring-4 ring-primary/20",
                    !isDone && !isCurrent && "border-border bg-card"
                  )}
                  aria-hidden="true"
                >
                  {isDone && (
                    <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} />
                  )}
                </span>
                <span
                  className={cn(
                    "text-sm transition-colors",
                    isCurrent
                      ? "font-semibold text-primary"
                      : isDone
                        ? "text-foreground"
                        : "text-muted"
                  )}
                >
                  {stage}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
