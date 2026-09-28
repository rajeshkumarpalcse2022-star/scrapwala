"use client";

import { useState } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { adminNotifications } from "@/lib/constants/adminDemoData";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import type { AdminNotification } from "@/types/admin";

const TYPE_COLORS: Record<AdminNotification["type"], string> = {
  pickup: "bg-blue-100 text-blue-600",
  payment: "bg-emerald-100 text-emerald-600",
  collector: "bg-purple-100 text-purple-600",
  system: "bg-gray-100 text-gray-600",
};

type TabFilter = "all" | "unread";

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<AdminNotification[]>(
    adminNotifications
  );
  const [tab, setTab] = useState<TabFilter>("all");

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = notifications.filter((n) =>
    tab === "unread" ? !n.read : true
  );

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const formatTime = (time: string) => {
    const date = new Date(time);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Notifications"
        subtitle="System notifications and alerts."
        action={
          unreadCount > 0 ? (
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              <CheckCheck className="h-4 w-4" />
              Mark All Read
            </button>
          ) : undefined
        }
      />

      <div className="flex gap-2">
        {(["all", "unread"] as TabFilter[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t === "all" ? "All" : "Unread"}
            {t === "unread" && unreadCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs text-emerald-600">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <Bell className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">
            {tab === "unread"
              ? "No unread notifications."
              : "No notifications."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <button
              key={n.id}
              onClick={() => markAsRead(n.id)}
              className={`w-full text-left rounded-xl border p-4 transition ${
                n.read
                  ? "border-gray-200 bg-white"
                  : "border-blue-200 bg-blue-50"
              } hover:shadow-sm`}
            >
              <div className="flex gap-4">
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${TYPE_COLORS[n.type]}`}
                >
                  <Bell className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={`text-sm font-semibold ${
                        n.read ? "text-gray-700" : "text-gray-900"
                      }`}
                    >
                      {n.title}
                    </h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!n.read && (
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                      {n.read && (
                        <Check className="h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                  </div>
                  <p
                    className={`mt-1 text-sm ${
                      n.read ? "text-gray-500" : "text-gray-600"
                    }`}
                  >
                    {n.message}
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    {formatTime(n.time)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
