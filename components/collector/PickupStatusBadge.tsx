import { STATUS_LABELS, STATUS_COLORS, PickupStatus } from "@/lib/constants/collectorDemoData";

interface PickupStatusBadgeProps {
  status: PickupStatus;
}

export default function PickupStatusBadge({ status }: PickupStatusBadgeProps) {
  const dotColor = STATUS_COLORS[status].includes("blue")
    ? "bg-blue-500"
    : STATUS_COLORS[status].includes("yellow")
      ? "bg-yellow-500"
      : STATUS_COLORS[status].includes("indigo")
        ? "bg-indigo-500"
        : STATUS_COLORS[status].includes("purple")
          ? "bg-purple-500"
          : STATUS_COLORS[status].includes("orange")
            ? "bg-orange-500"
            : STATUS_COLORS[status].includes("amber")
              ? "bg-amber-500"
              : STATUS_COLORS[status].includes("emerald")
                ? "bg-emerald-500"
                : "bg-red-500";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}
