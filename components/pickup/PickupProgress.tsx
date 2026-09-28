"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  number: number;
  label: string;
}

interface PickupProgressProps {
  steps: Step[];
  currentStep: number;
}

export default function PickupProgress({ steps, currentStep }: PickupProgressProps) {
  const currentStepIndex = steps.findIndex((s) => s.number === currentStep);
  // Beyond the numbered steps (e.g. the Review screen) every step is complete.
  const allCompleted = currentStepIndex === -1;
  const progressIndex = allCompleted ? steps.length : currentStepIndex;
  const currentLabel = allCompleted
    ? "Review"
    : steps[currentStepIndex]?.label ?? "";

  return (
    <div className="mb-8">
      {/* Desktop stepper */}
      <div className="hidden sm:block">
        <ol className="flex items-center" role="list">
          {steps.map((step, index) => {
            const isCompleted = allCompleted || index < currentStepIndex;
            const isCurrent = !allCompleted && index === currentStepIndex;
            const isUpcoming = !allCompleted && index > currentStepIndex;

            return (
              <li
                key={step.number}
                className={cn(
                  "flex items-center",
                  index < steps.length - 1 && "flex-1"
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                      isCompleted && "bg-primary text-white",
                      isCurrent && "bg-primary text-white ring-4 ring-primary-light",
                      isUpcoming && "bg-muted-light text-muted border border-border"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      step.number
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-medium whitespace-nowrap",
                      isCompleted && "text-primary",
                      isCurrent && "text-foreground",
                      isUpcoming && "text-muted"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "mx-3 h-0.5 flex-1 transition-colors",
                      index < progressIndex ? "bg-primary" : "bg-border"
                    )}
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Mobile compact indicator */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">
            {allCompleted
              ? "Review"
              : `Step ${currentStep} of ${steps.length}`}
          </span>
          <span className="text-sm text-muted">{currentLabel}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted-light overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{
              width: `${((progressIndex + (allCompleted ? 0 : 1)) / steps.length) * 100}%`,
            }}
            role="progressbar"
            aria-valuenow={allCompleted ? steps.length : currentStepIndex + 1}
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-label={
              allCompleted
                ? "All steps completed, review your booking"
                : `Step ${currentStep} of ${steps.length}: ${currentLabel}`
            }
          />
        </div>
      </div>
    </div>
  );
}
