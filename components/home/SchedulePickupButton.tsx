"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function SchedulePickupButton() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // Public Home CTA by authenticated role:
  //   logged out       → "Login / Signup" → /login
  //   user             → "Schedule Pickup" → /pickup   (unchanged)
  //   admin            → "Go to Dashboard" → /admin
  //   collector        → "Go to Dashboard" → /collector
  const isAuthenticated = !isLoading && !!user;
  const role = user?.role;

  let href = "/login";
  let label = "Login / Signup";
  let suffix = "+";

  if (isAuthenticated && role === "user") {
    href = "/pickup";
    label = "Schedule Pickup";
  } else if (isAuthenticated && (role === "admin" || role === "collector")) {
    href = role === "admin" ? "/admin" : "/collector";
    label = "Go to Dashboard";
    suffix = "→";
  }

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      router.push(href);
    },
    [router, href]
  );

  return (
    <div className="pulse-btn-wrap">
      <div className="pulse-ring" aria-hidden="true" />
      <div className="pulse-ring" aria-hidden="true" />
      <div className="pulse-ring" aria-hidden="true" />

      <a
        href={href}
        className="pulse-btn-cta"
        role="button"
        tabIndex={0}
        aria-disabled={isLoading}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            router.push(href);
          }
        }}
      >
        {label}
        <span className="pulse-btn-plus">{suffix}</span>
      </a>
    </div>
  );
}