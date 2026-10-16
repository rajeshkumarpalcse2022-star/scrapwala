"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import CheckRatesSheet from "@/components/scrap-rates/CheckRatesSheet";

export default function SchedulePickupButton() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [ratesOpen, setRatesOpen] = useState(false);

  // Public Home CTA by authenticated role:
  //   logged out       → "Login / Signup" → /login
  //   user             → "Schedule Pickup" → Check Rates sheet → /pickup
  //   admin            → "Go to Dashboard" → /admin
  //   collector        → "Go to Dashboard" → /collector
  const isAuthenticated = !isLoading && !!user;
  const role = user?.role;
  const isCustomer = isAuthenticated && role === "user";

  let href = "/login";
  let label = "Login / Signup";
  let suffix = "+";

  if (isCustomer) {
    href = "/pickup";
    label = "Schedule Pickup";
  } else if (isAuthenticated && (role === "admin" || role === "collector")) {
    href = role === "admin" ? "/admin" : "/collector";
    label = "Go to Dashboard";
    suffix = "→";
  }

  const go = useCallback(() => {
    router.push(href);
  }, [router, href]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      // Customers first browse rates in the sheet, then continue to steps.
      if (isCustomer) {
        setRatesOpen(true);
        return;
      }
      go();
    },
    [isCustomer, go]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (isCustomer) {
          setRatesOpen(true);
          return;
        }
        go();
      }
    },
    [isCustomer, go]
  );

  const handleContinue = useCallback(() => {
    setRatesOpen(false);
    router.push("/pickup");
  }, [router]);

  return (
    <>
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
          onKeyDown={handleKeyDown}
        >
          {label}
          <span className="pulse-btn-plus">{suffix}</span>
        </a>
      </div>

      {isCustomer && (
        <CheckRatesSheet
          open={ratesOpen}
          onClose={() => setRatesOpen(false)}
          onContinue={handleContinue}
        />
      )}
    </>
  );
}
