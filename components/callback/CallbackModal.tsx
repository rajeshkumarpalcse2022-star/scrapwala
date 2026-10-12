"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Boxes,
  CalendarClock,
  CheckCircle2,
  Loader2,
  MapPin,
  PackageSearch,
  PenLine,
  PhoneCall,
  IndianRupee,
  X,
} from "lucide-react";
import {
  CALLBACK_REASONS,
  CALLBACK_REASON_LABELS,
  type CallbackReason,
} from "@/lib/validations/callback";
import type { MapCoords } from "@/components/pickup/MapPicker";

const MapPicker = dynamic(() => import("@/components/pickup/MapPicker"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-56 items-center justify-center rounded-xl bg-muted/40"
      role="status"
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
    </div>
  ),
});

const REASON_ICONS: Record<CallbackReason, typeof CalendarClock> = {
  schedule_pickup: CalendarClock,
  check_pickup_status: PackageSearch,
  enquire_rates: IndianRupee,
  bulk_pickup_query: Boxes,
  something_else: PenLine,
};

type LocationState = "idle" | "locating" | "success" | "error";

interface CallbackModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CallbackModal({ open, onClose }: CallbackModalProps) {
  const [reasonType, setReasonType] = useState<CallbackReason | null>(null);
  const [customReason, setCustomReason] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [coords, setCoords] = useState<MapCoords | null>(null);
  const [address, setAddress] = useState("");
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [showMap, setShowMap] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedPhone, setSubmittedPhone] = useState("");

  const autoLocateAttemptedRef = useRef(false);
  const geocodeSeqRef = useRef(0);

  // Close on Escape + lock body scroll while open.
  useEffect(() => {
    if (!open) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const reverseGeocode = useCallback(async (point: MapCoords) => {
    const seq = ++geocodeSeqRef.current;
    try {
      const params = new URLSearchParams({
        latitude: String(point.latitude),
        longitude: String(point.longitude),
      });
      const res = await fetch(`/api/geocode/reverse?${params}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (seq !== geocodeSeqRef.current) return;
      if (res.ok && json?.success) {
        const parts = [
          json.data?.city,
          json.data?.state,
          json.data?.pinCode,
        ].filter(Boolean);
        setAddress(parts.join(", "));
      }
    } catch {
      // Address line is best-effort; coordinates are what matter.
    }
  }, []);

  const captureCurrentLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocationState("error");
      return;
    }
    setLocationState("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point: MapCoords = {
          latitude: Math.round(position.coords.latitude * 1e6) / 1e6,
          longitude: Math.round(position.coords.longitude * 1e6) / 1e6,
        };
        setCoords(point);
        setLocationState("success");
        void reverseGeocode(point);
      },
      () => setLocationState("error"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [reverseGeocode]);

  // Try once per modal session to pre-capture location (matches the
  // "Location captured" UX); failure is silent and non-blocking.
  useEffect(() => {
    if (!open || autoLocateAttemptedRef.current) return;
    autoLocateAttemptedRef.current = true;
    captureCurrentLocation();
  }, [open, captureCurrentLocation]);

  const handleMapChange = useCallback(
    (point: MapCoords) => {
      setCoords(point);
      setLocationState("success");
      void reverseGeocode(point);
    },
    [reverseGeocode]
  );

  const handlePhoneChange = (value: string) => {
    setPhone(value.replace(/\D/g, "").slice(0, 10));
  };

  const handleSubmit = async () => {
    setSubmitError(null);

    if (!reasonType) {
      setSubmitError("Please choose what this is about");
      return;
    }
    if (!name.trim()) {
      setSubmitError("Please enter your name");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setSubmitError("Please enter a valid 10-digit Indian mobile number");
      return;
    }
    if (reasonType === "something_else" && customReason.trim().length < 3) {
      setSubmitError("Please tell us your reason");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/callbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone,
          reasonType,
          customReason:
            reasonType === "something_else" ? customReason.trim() : undefined,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          address: address || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to submit request");
      }
      setSubmittedPhone(phone);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to submit request"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Request a Callback"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {submitted ? "Request Received!" : "Request a Callback"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {submitted
                ? "Thank you! Our team will call you back shortly."
                : "Share your details and our team will call you back."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-muted/10 hover:text-foreground"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {submitted ? (
            <div className="flex flex-col items-center py-8 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-9 w-9 text-primary" aria-hidden="true" />
              </span>
              <p className="mt-4 text-base font-semibold text-foreground">
                We&apos;ll call you back soon!
              </p>
              <p className="mt-1 text-sm text-muted">
                Our team will reach you on{" "}
                <span className="font-medium text-foreground">
                  +91 {submittedPhone}
                </span>
                .
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Reason */}
              <div>
                <p className="text-sm font-semibold text-foreground">
                  What is this about?
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {CALLBACK_REASONS.filter((r) => r !== "something_else").map(
                    (reason) => {
                      const Icon = REASON_ICONS[reason];
                      const selected = reasonType === reason;
                      return (
                        <button
                          key={reason}
                          type="button"
                          onClick={() => setReasonType(reason)}
                          className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                            selected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-foreground hover:border-primary/40"
                          }`}
                        >
                          <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                          {CALLBACK_REASON_LABELS[reason]}
                        </button>
                      );
                    }
                  )}
                  <button
                    type="button"
                    onClick={() => setReasonType("something_else")}
                    className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors sm:col-span-2 ${
                      reasonType === "something_else"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-foreground hover:border-primary/40"
                    }`}
                  >
                    <PenLine className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                    Something else
                  </button>
                </div>
                {reasonType === "something_else" && (
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Tell us your reason"
                    maxLength={500}
                    className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                )}
              </div>

              <div className="border-t border-border" />

              {/* Contact details */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="callback-name"
                    className="block text-sm font-semibold text-foreground"
                  >
                    Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="callback-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    maxLength={100}
                    className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="callback-phone"
                    className="block text-sm font-semibold text-foreground"
                  >
                    Enter your registered number{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="callback-phone"
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="9999999999"
                    maxLength={10}
                    className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <p className="text-sm font-semibold text-foreground">Location</p>
                <div className="mt-2 rounded-xl border border-border bg-card p-4">
                  {locationState === "success" && coords ? (
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <CheckCircle2
                          className="h-5 w-5 text-primary"
                          aria-hidden="true"
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">
                          Location captured
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {address ||
                            `${coords.latitude}, ${coords.longitude}`}
                        </p>
                      </div>
                    </div>
                  ) : locationState === "locating" ? (
                    <div className="flex items-center gap-3 text-sm text-muted">
                      <Loader2
                        className="h-5 w-5 animate-spin text-primary"
                        aria-hidden="true"
                      />
                      Finding your location…
                    </div>
                  ) : locationState === "error" ? (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-muted">
                        Location unavailable. You can skip it or try again.
                      </p>
                      <button
                        type="button"
                        onClick={captureCurrentLocation}
                        className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40"
                      >
                        Retry
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={captureCurrentLocation}
                      className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      Use my current location
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowMap((prev) => !prev)}
                    className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/40"
                  >
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    {showMap ? "Hide map" : "Adjust on map"}
                  </button>

                  {showMap && (
                    <div className="mt-3">
                      <MapPicker value={coords} onChange={handleMapChange} />
                    </div>
                  )}
                </div>
              </div>

              {submitError && (
                <p
                  role="alert"
                  className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive"
                >
                  {submitError}
                </p>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <PhoneCall className="h-4 w-4" aria-hidden="true" />
                )}
                Request Callback
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
