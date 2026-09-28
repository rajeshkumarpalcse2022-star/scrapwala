"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useUnreadNotificationCount } from "@/hooks/useUnreadNotifications";

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className }: NotificationBellProps) {
  const unreadCount = useUnreadNotificationCount();

  return (
    <Link
      href="/collector/notifications"
      aria-label={`Notifications${
        unreadCount > 0 ? `, ${unreadCount} unread` : ""
      }`}
      className={`relative rounded-lg p-2 text-gray-600 hover:bg-gray-100 ${
        className ?? ""
      }`}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
