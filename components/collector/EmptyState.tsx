import { Inbox, type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
}

export default function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  const ResolvedIcon = Icon ?? Inbox;
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
        <ResolvedIcon className="h-8 w-8 text-green-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>
    </div>
  );
}
