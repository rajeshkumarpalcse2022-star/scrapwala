import { Info } from "lucide-react";

export default function RateNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <p className="text-xs leading-relaxed text-muted">
        Rates shown are indicative and may vary based on material quality,
        quantity, condition and final weighing.
      </p>
    </div>
  );
}
