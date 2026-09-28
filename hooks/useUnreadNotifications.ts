"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

/**
 * Lightweight shared unread-notification count store.
 *
 * - Single fetch shared by every subscriber (header bell, mobile bell).
 * - Refreshed on: mount, collector navigation, tab visibility, and after a
 *   notification is marked read (NOTIFICATIONS_UPDATED_EVENT).
 * - No polling loops, no WebSockets/SSE, no hardcoded counts.
 */

export const NOTIFICATIONS_UPDATED_EVENT = "scrapwala:notifications-updated";

let unreadCount = 0;
let listenerCount = 0;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function setCount(next: number) {
  if (next !== unreadCount) {
    unreadCount = next;
    emit();
  }
}

async function fetchUnreadCount(): Promise<void> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await fetch("/api/collector/notifications", {
        cache: "no-store",
      });
      const data = await res.json();
      if (
        res.ok &&
        data?.success &&
        typeof data?.data?.unreadCount === "number"
      ) {
        setCount(data.data.unreadCount);
      }
    } catch {
      // Non-critical UI: keep the previous value on network failure.
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Refetch the unread count from the database. */
export function refreshUnreadCount(): Promise<void> {
  return fetchUnreadCount();
}

/** Notify the bell that notification read state changed. */
export function notifyNotificationsUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  listenerCount += 1;
  return () => {
    listeners.delete(listener);
    listenerCount -= 1;
    // Leaving the collector area: clear state so a different account
    // logged into the same tab never sees a stale badge.
    if (listenerCount <= 0) {
      listenerCount = 0;
      unreadCount = 0;
    }
  };
}

function getSnapshot(): number {
  return unreadCount;
}

function getServerSnapshot(): number {
  return 0;
}

export function useUnreadNotificationCount(): number {
  const pathname = usePathname();
  const count = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Fresh count on mount and whenever the collector navigates.
  useEffect(() => {
    refreshUnreadCount();
  }, [pathname]);

  // Refresh when the collector returns to the tab, and after mark-read.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshUnreadCount();
      }
    };
    const onUpdated = () => {
      refreshUnreadCount();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, onUpdated);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, onUpdated);
    };
  }, []);

  return count;
}
