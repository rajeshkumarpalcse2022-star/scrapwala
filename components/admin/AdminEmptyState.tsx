import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

interface AdminEmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
}

export default function AdminEmptyState({
  title,
  description,
  icon: Icon = Inbox,
}: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>
    </div>
  );
}
