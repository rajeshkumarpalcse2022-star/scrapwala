"use client";

import { useState } from "react";
import { MapPin, Navigation, Copy, Check } from "lucide-react";

interface PickupAddressCardProps {
  address: string;
  city: string;
}

export default function PickupAddressCard({ address, city }: PickupAddressCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${address}, ${city}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard write failed silently
    }
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
          disabled
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-muted-light px-4 py-2.5 text-xs font-medium text-muted cursor-not-allowed"
        >
          <Navigation className="h-4 w-4" />
          Navigate
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
