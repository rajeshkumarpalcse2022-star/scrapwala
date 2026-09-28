"use client";

import { Menu, Search, Bell } from "lucide-react";
import { adminUser, adminNotifications } from "@/lib/constants/adminDemoData";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

const initials = adminUser.name
  .split(" ")
  .map((w) => w[0])
  .join("");

interface AdminHeaderProps {
  onMenuClick: () => void;
}

export default function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const unreadCount = adminNotifications.filter((n) => !n.read).length;

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
          {getGreeting()}, {adminUser.name.split(" ")[0]}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
        </div>

        <button className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
            {initials}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900">
              {adminUser.name}
            </p>
            <p className="text-xs text-gray-500">{adminUser.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
