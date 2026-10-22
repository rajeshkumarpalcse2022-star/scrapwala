"use client";

import { useState } from "react";
import { MapPin, Navigation, Copy, Check, Loader2 } from "lucide-react";

interface PickupAddressCardProps {
  address: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
}

export default function PickupAddressCard({
  address,
  city,
  latitude,
  longitude,
}: PickupAddressCardProps) {
  const [copied, setCopied] = useState(false);
  const [locating, setLocating] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${address}, ${city}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard write failed silently
    }
  };

  const openGoogleMaps = (origin?: string) => {
    const hasCoords =
      typeof latitude === "number" &&
      typeof longitude === "number" &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude);
    const destination = hasCoords
      ? `${latitude},${longitude}`
      : `${address}, ${city}`;
    const params = new URLSearchParams({
      api: "1",
      destination,
      travelmode: "driving",
    });
    if (origin) params.set("origin", origin);
    window.open(
      `https://www.google.com/maps/dir/?${params.toString()}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleNavigate = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      // No GPS support — Maps will fall back to the device's own location.
      openGoogleMaps();
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        openGoogleMaps(
          `${position.coords.latitude},${position.coords.longitude}`
        );
      },
      () => {
        // Permission denied / timeout — open without a fixed origin so
        // Google Maps can use the device location itself.
        setLocating(false);
        openGoogleMaps();
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{address}</p>
          <p className="text-xs text-muted">{city}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={handleNavigate}
          disabled={locating}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-muted-light px-4 py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-70"
        >
          {locating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Locating…
            </>
          ) : (
            <>
              <Navigation className="h-4 w-4" />
              Navigate
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-colors ${
            copied
              ? "bg-emerald-500 text-white"
              : "bg-primary text-white hover:bg-primary/90"
          }`}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy Address
            </>
          )}
        </button>
      </div>
    </div>
  );
}
