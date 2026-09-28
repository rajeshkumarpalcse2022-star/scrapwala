interface AdminStatusBadgeProps {
  status: string;
  colors: Record<string, string>;
  labels: Record<string, string>;
}

export default function AdminStatusBadge({
  status,
  colors,
  labels,
}: AdminStatusBadgeProps) {
  const colorClass = colors[status] || "bg-gray-100 text-gray-700";
  const label = labels[status] || status;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {label}
    </span>
  );
}
