"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

/**
 * Lightweight shared unseen-pickup count store (admin + collector scopes).
 *
 * - Single fetch shared by every subscriber of a scope.
 * - Refreshed on: mount, navigation, tab visibility, and after a pickup is
 *   marked seen. No polling loops, no WebSockets/SSE, no hardcoded counts.
 */

export type UnseenPickupScope = "admin" | "collector";

const ENDPOINTS: Record<UnseenPickupScope, string> = {
  admin: "/api/admin/pickups/unseen-count",
  collector: "/api/collector/pickups/unseen-count",
};

const SEEN_ENDPOINTS: Record<UnseenPickupScope, string> = {
  admin: "/api/admin/pickups",
  collector: "/api/collector/pickups",
};

interface UnseenScopeStore {
  count: number;
  listenerCount: number;
  inFlight: Promise<void> | null;
  rerunPending: boolean;
  listeners: Set<() => void>;
}

function createScopeStore(): UnseenScopeStore {
  return {
    count: 0,
    listenerCount: 0,
    inFlight: null,
    rerunPending: false,
    listeners: new Set(),
  };
}

const stores: Record<UnseenPickupScope, UnseenScopeStore> = {
  admin: createScopeStore(),
  collector: createScopeStore(),
};

function emit(scope: UnseenPickupScope): void {
  [...stores[scope].listeners].forEach((listener) => listener());
}

function setCount(scope: UnseenPickupScope, next: number): void {
  const store = stores[scope];
  if (next !== store.count) {
    store.count = next;
    emit(scope);
  }
}

async function fetchUnseenCount(scope: UnseenPickupScope): Promise<void> {
  try {
    const res = await fetch(ENDPOINTS[scope], { cache: "no-store" });
    const data = await res.json();
    if (
      res.ok &&
      data?.success &&
      typeof data?.data?.count === "number"
    ) {
      setCount(scope, data.data.count);
    }
  } catch {
    // Non-critical UI: keep the previous value on network failure.
  }
}

/**
 * Refetch the unseen count for a scope. Deduplicates concurrent calls but
 * always runs one trailing fetch so a refresh requested while another was
 * in flight can never be lost.
 */
export function refreshUnseenPickupCount(
  scope: UnseenPickupScope
): Promise<void> {
  const store = stores[scope];

  if (store.inFlight) {
    store.rerunPending = true;
    return store.inFlight;
  }

  store.inFlight = (async () => {
    try {
      await fetchUnseenCount(scope);
    } finally {
      store.inFlight = null;
      if (store.rerunPending) {
        store.rerunPending = false;
        void refreshUnseenPickupCount(scope);
      }
    }
  })();

  return store.inFlight;
}

/**
 * Marks a pickup as seen on the server, then refreshes the scope's count.
 * Fire-and-forget from the pickup detail pages; never blocks navigation.
 */
export function reportPickupSeen(
  scope: UnseenPickupScope,
  pickupId: string
): void {
  fetch(`${SEEN_ENDPOINTS[scope]}/${encodeURIComponent(pickupId)}/seen`, {
    method: "PATCH",
  })
    .then(() => refreshUnseenPickupCount(scope))
    .catch(() => {
      // Non-critical UI: count simply stays as-is if the call fails.
    });
}

function subscribe(
  scope: UnseenPickupScope,
  listener: () => void
): () => void {
  const store = stores[scope];
  store.listeners.add(listener);
  store.listenerCount += 1;

  return () => {
    store.listeners.delete(listener);
    store.listenerCount -= 1;
    // Leaving the area: clear state so a different account logged into the
    // same tab never sees a stale badge.
    if (store.listenerCount <= 0) {
      store.listenerCount = 0;
      store.count = 0;
      store.rerunPending = false;
    }
  };
}

function getSnapshot(scope: UnseenPickupScope): number {
  return stores[scope].count;
}

function getServerSnapshot(): number {
  return 0;
}

// Stable subscribe functions: React re-subscribes whenever the function
// identity changes, and our cleanup resets the shared count on the last
// unsubscribe — so an inline arrow here would wipe the count on every
// update and keep the badge stuck at 0.
const subscribeFns: Record<UnseenPickupScope, (listener: () => void) => () => void> = {
  admin: (listener) => subscribe("admin", listener),
  collector: (listener) => subscribe("collector", listener),
};

export function useUnseenPickupCount(scope: UnseenPickupScope): number {
  const pathname = usePathname();
  const count = useSyncExternalStore(
    subscribeFns[scope],
    () => getSnapshot(scope),
    getServerSnapshot
  );

  // Fresh count on mount and whenever the user navigates.
  useEffect(() => {
    refreshUnseenPickupCount(scope);
  }, [scope, pathname]);

  // Refresh when the user returns to the tab.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshUnseenPickupCount(scope);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [scope]);

  return count;
}
