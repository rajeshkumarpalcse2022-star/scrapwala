"use client";

import { Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import NotificationBell from "@/components/collector/NotificationBell";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface CollectorHeaderProps {
  onMenuClick: () => void;
}

export default function CollectorHeader({ onMenuClick }: CollectorHeaderProps) {
  const { user } = useAuth();

  const displayName = user?.name || "Collector";
  const firstName = displayName.split(" ")[0];

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-white px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">
          {getGreeting()}, {firstName}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell />

        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              {getInitials(displayName)}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900">{displayName}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role || "collector"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
