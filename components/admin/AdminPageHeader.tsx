import type { ReactNode } from "react";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export default function AdminPageHeader({
  title,
  subtitle,
  action,
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        )}
      </div>
      {action && <div className="mt-3 sm:mt-0">{action}</div>}
    </div>
  );
}
