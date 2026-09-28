"use client";

import { Fragment } from "react";
import { Check } from "lucide-react";

type PickupStatus =
  | "assigned"
  | "accepted"
  | "on_the_way"
  | "arrived"
  | "weighing"
  | "payment_pending"
  | "completed"
  | "cancelled";

const STEPS: PickupStatus[] = [
  "assigned",
  "accepted",
  "on_the_way",
  "arrived",
  "weighing",
  "payment_pending",
];

const STATUS_LABELS: Record<PickupStatus, string> = {
  assigned: "Assigned",
  accepted: "Accepted",
  on_the_way: "On the Way",
  arrived: "Arrived",
  weighing: "Weighing",
  payment_pending: "Payment Integration Pending",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Short display labels for the compact mobile stepper only (desktop keeps STATUS_LABELS). */
const MOBILE_LABELS: Record<PickupStatus, string> = {
  assigned: "Assigned",
  accepted: "Accepted",
  on_the_way: "On the Way",
  arrived: "Arrived",
  weighing: "Weighing",
  payment_pending: "Payment",
  completed: "Completed",
  cancelled: "Cancelled",
};

interface PickupProgressProps {
  currentStatus: PickupStatus;
}

export default function PickupProgress({ currentStatus }: PickupProgressProps) {
  const currentIndex = STEPS.indexOf(currentStatus);

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-5 text-sm font-semibold text-foreground">Pickup Progress</h3>

      {/* Desktop / laptop (lg and up): original layout, unchanged */}
      <div className="hidden gap-0 lg:flex lg:flex-row lg:items-start lg:gap-0">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div
              key={step}
              className="flex items-center lg:flex-1"
            >
              <div className="flex items-center gap-3 lg:flex-col lg:items-center lg:gap-2">
                <div className="relative flex shrink-0 items-center justify-center">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                      isCompleted
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                        ? "bg-emerald-500 text-white animate-pulse"
                        : "border-2 border-gray-300 text-gray-400"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </span>
                </div>
                <span
                  className={`whitespace-nowrap text-xs font-medium lg:text-center ${
                    isCompleted
                      ? "text-emerald-600"
                      : isCurrent
                      ? "font-bold text-foreground"
                      : "text-gray-400"
                  }`}
                >
                  {STATUS_LABELS[step]}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`ml-3 h-0.5 w-5 lg:mx-1 lg:mt-[-1.5rem] lg:h-5 lg:w-0.5 ${
                    index < currentIndex
                      ? "bg-emerald-500"
                      : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile / tablet (below lg): compact horizontal stepper */}
      <div className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1 lg:hidden">
        <div className="flex min-w-max items-start">
          {STEPS.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const segmentDone = index < currentIndex;

            return (
              <Fragment key={step}>
                <div
                  className="stepper-pop flex shrink-0 flex-col items-center gap-1.5"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${
                      isCompleted
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                        ? "bg-emerald-500 text-white ring-4 ring-emerald-100"
                        : "bg-gray-800 text-gray-300"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span
                    className={`whitespace-nowrap text-center text-[10px] leading-tight ${
                      isCompleted
                        ? "text-emerald-600"
                        : isCurrent
                        ? "font-bold text-foreground"
                        : "text-gray-400"
                    }`}
                  >
                    {MOBILE_LABELS[step]}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`stepper-line -mx-3 mt-[11px] h-0.5 w-12 shrink-0 ${
                      segmentDone ? "bg-emerald-500" : "bg-gray-300"
                    }`}
                    style={{ animationDelay: `${index * 150 + 80}ms` }}
                  />
                )}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
