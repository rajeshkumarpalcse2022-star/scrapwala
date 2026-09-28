"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: "user" | "collector" | "admin";
  isVerified: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || !json.success) return null;

    // GET /api/auth/me returns { success, user } (object-form successResponse).
    // Also accept the { success, data: { user } } wrapper for safety.
    const user = json.data?.user ?? json.user;
    return (user as AuthUser) ?? null;
  } catch {
    return null;
  }
}

/**
 * Shared client-side authentication state.
 * Uses the existing GET /api/auth/me endpoint as the single source of truth.
 */
export function useAuth(): AuthState {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchCurrentUser().then((u) => {
      if (!cancelled) {
        setUser(u);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const u = await fetchCurrentUser();
    setUser(u);
    setIsLoading(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore network errors; still clear local state
    }
    setUser(null);
    router.refresh();
  }, [router]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    refresh,
    logout,
  };
}