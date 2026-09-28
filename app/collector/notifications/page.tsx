"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import { notifyNotificationsUpdated } from "@/hooks/useUnreadNotifications";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  time?: string;
  type?: string;
  pickupId?: string;
}

function formatTime(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch("/api/collector/notifications", {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.message || "Unable to load notifications.");
          return;
        }
        setNotifications((data.data?.items || []) as NotificationItem[]);
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchNotifications();
  }, []);

  const openNotification = async (notification: NotificationItem) => {
    // Already read: just follow the pickup link (if any).
    if (notification.read) {
      if (notification.pickupId) {
        router.push(`/collector/pickups/${notification.pickupId}`);
      }
      return;
    }

    // Optimistic read state.
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
    );

    try {
      const res = await fetch("/api/collector/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notification.id }),
      });

      if (!res.ok) throw new Error("Failed to mark as read");

      // Recalculate the header bell badge from the database.
      notifyNotificationsUpdated();

      // Pickup assignment notifications open the assigned pickup.
      if (notification.pickupId) {
        router.push(`/collector/pickups/${notification.pickupId}`);
      }
    } catch {
      // Revert the optimistic update; server state stays authoritative.
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, read: false } : n
        )
      );
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-muted">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>

      {error ? (
        <div className="rounded-xl border bg-white p-6">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <Bell className="w-16 h-16 mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold mb-2">No Notifications</h2>
          <p>You&apos;re all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => openNotification(notification)}
              type="button"
              className={`w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-colors ${
                notification.read
                  ? "bg-white"
                  : "bg-blue-50 border-blue-200"
              }`}
            >
              <div
                className={`p-2 rounded-full ${
                  notification.read ? "bg-gray-100" : "bg-blue-100"
                }`}
              >
                <Bell
                  className={`w-5 h-5 ${
                    notification.read ? "text-gray-500" : "text-blue-600"
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold break-words">{notification.title}</h3>
                  {!notification.read && (
                    <span className="w-2 h-2 shrink-0 bg-blue-500 rounded-full" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1 break-words">
                  {notification.message}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  {formatTime(notification.time)}
                </p>
              </div>
              {notification.read && (
                <Check className="w-4 h-4 text-green-500 mt-1" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
