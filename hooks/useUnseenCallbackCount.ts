"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

/**
 * Shared unseen callback-request count store for the admin sidebar badge.
 * Refreshed on: mount, navigation, tab visibility, and after explicit
 * refreshUnseenCallbackCount() calls. No polling loops.
 */

const ENDPOINT = "/api/admin/callbacks/unseen-count";

interface UnseenCallbackStore {
  count: number;
  listenerCount: number;
  inFlight: Promise<void> | null;
  rerunPending: boolean;
  listeners: Set<() => void>;
}

const store: UnseenCallbackStore = {
  count: 0,
  listenerCount: 0,
  inFlight: null,
  rerunPending: false,
  listeners: new Set(),
};

function emit(): void {
  [...store.listeners].forEach((listener) => listener());
}

function setCount(next: number): void {
  if (next !== store.count) {
    store.count = next;
    emit();
  }
}

async function fetchUnseenCount(): Promise<void> {
  try {
    const res = await fetch(ENDPOINT, { cache: "no-store" });
    const data = await res.json();
    if (res.ok && data?.success && typeof data?.data?.count === "number") {
      setCount(data.data.count);
    }
  } catch {
    // Non-critical UI: keep the previous value on network failure.
  }
}

/** Refetch the unseen callback count (deduped, trailing run guaranteed). */
export function refreshUnseenCallbackCount(): Promise<void> {
  if (store.inFlight) {
    store.rerunPending = true;
    return store.inFlight;
  }

  store.inFlight = (async () => {
    try {
      await fetchUnseenCount();
    } finally {
      store.inFlight = null;
      if (store.rerunPending) {
        store.rerunPending = false;
        void refreshUnseenCallbackCount();
      }
    }
  })();

  return store.inFlight;
}

function subscribe(listener: () => void): () => void {
  store.listeners.add(listener);
  store.listenerCount += 1;

  return () => {
    store.listeners.delete(listener);
    store.listenerCount -= 1;
    // Leaving admin: clear state so a stale badge never lingers.
    if (store.listenerCount <= 0) {
      store.listenerCount = 0;
      store.count = 0;
      store.rerunPending = false;
    }
  };
}

function getSnapshot(): number {
  return store.count;
}

function getServerSnapshot(): number {
  return 0;
}

export function useUnseenCallbackCount(): number {
  const pathname = usePathname();
  const count = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  useEffect(() => {
    refreshUnseenCallbackCount();
  }, [pathname]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshUnseenCallbackCount();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return count;
}
