"use client";

import { useEffect, useRef, useState } from "react";
import type { PickupAddress } from "@/types/pickup";
import { INDIAN_STATES } from "@/lib/constants/pickup";
import { cn } from "@/lib/utils";
import MapPicker, { type MapCoords } from "@/components/pickup/MapPicker";
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  MapPin,
} from "lucide-react";

interface LocationStepProps {
  initialData: PickupAddress | null;
  onNext: (address: PickupAddress) => void;
  onBack: () => void;
}

const defaultAddress: PickupAddress = {
  fullName: "",
  phone: "",
  houseFlatBuilding: "",
  streetArea: "",
  landmark: "",
  city: "",
  state: "",
  pinCode: "",
  addressType: "home",
  latitude: null,
  longitude: null,
};

type ServiceabilityState =
  | "idle"
  | "checking"
  | "serviceable"
  | "not_serviceable"
  | "error";

/** Button lifecycle for "Pickup My Current Location". */
type LocateState = "idle" | "locating" | "geocoding" | "success";

interface GeocodeResult {
  city: string;
  state: string;
  pinCode: string;
}

interface GeocodeOutcome {
  /** Reverse-geocoding request succeeded. */
  ok: boolean;
  /** At least one of city/state/PIN was detected. */
  filled: boolean;
  /** A newer lookup superseded this one (its result is applied instead). */
  superseded: boolean;
}

const GEO_SUCCESS_RESET_MS = 2500;
const GEOCODE_DEBOUNCE_MS = 500;
const GEOCODE_KEY_PRECISION = 5;

const GEO_MESSAGES = {
  denied:
    "Location permission was denied. Please allow location access or enter your address manually.",
  unavailable:
    "Unable to detect your current location. Please try again or enter your address manually.",
  timeout: "Location detection timed out. Please try again.",
  unsupported:
    "Location detection is not supported by this browser. Please enter your address manually.",
} as const;

const GEOCODE_NOTICE =
  "Location detected, but we couldn't automatically fill the address. Please enter the missing details manually.";

const NO_COORDS_ERROR =
  "Please set your pickup location — use the current-location button or move the map.";

function geoErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return GEO_MESSAGES.denied;
    case 3:
      return GEO_MESSAGES.timeout;
    default:
      return GEO_MESSAGES.unavailable;
  }
}

function coordKey(coords: MapCoords): string {
  return `${coords.latitude.toFixed(GEOCODE_KEY_PRECISION)},${coords.longitude.toFixed(
    GEOCODE_KEY_PRECISION
  )}`;
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/** Reverse geocoding can return state names outside our select list. */
function matchIndianState(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  if (!value) return null;

  const exact = INDIAN_STATES.find((state) => state.toLowerCase() === value);
  if (exact) return exact;

  return (
    INDIAN_STATES.find((state) => {
      const name = state.toLowerCase();
      return name.includes(value) || value.includes(name);
    }) ?? null
  );
}

function sanitizePin(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 6 ? digits : "";
}

function hasAnyAddressValue(result: GeocodeResult): boolean {
  return Boolean(result.city || result.state || result.pinCode);
}

export default function LocationStep({
  initialData,
  onNext,
  onBack,
}: LocationStepProps) {
  const [address, setAddress] = useState<PickupAddress>(
    initialData || defaultAddress
  );
  const [errors, setErrors] = useState<
    Partial<Record<keyof PickupAddress, string>>
  >({});
  const [serviceability, setServiceability] =
    useState<ServiceabilityState>("idle");
  const [serviceableArea, setServiceableArea] = useState<string | null>(null);
  const [locateState, setLocateState] = useState<LocateState>("idle");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geocodeNotice, setGeocodeNotice] = useState<string | null>(null);

  const checkIdRef = useRef(0);
  const addressRef = useRef(address);
  const geoRequestIdRef = useRef(0);
  const geoBusyRef = useRef(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeSeqRef = useRef(0);
  const lastGeocodeKeyRef = useRef<string | null>(null);
  const lastGeocodeResultRef = useRef<GeocodeResult | null>(null);
  const inflightKeyRef = useRef<string | null>(null);
  const inflightPromiseRef = useRef<Promise<GeocodeResult | null> | null>(null);

  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    };
  }, []);

  const updateField = (field: keyof PickupAddress, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (field === "pinCode") {
      runServiceabilityCheck(
        {
          latitude: address.latitude,
          longitude: address.longitude,
        },
        value
      );
    }
  };

  // Advisory serviceability preview — event-driven (map move / PIN entry);
  // the server re-validates on booking.
  async function runServiceabilityCheck(
    coords: { latitude?: number | null; longitude?: number | null },
    pin: string
  ) {
    const checkId = ++checkIdRef.current;
    const validPin = /^\d{6}$/.test(pin.trim());
    const validCoords =
      typeof coords.latitude === "number" && typeof coords.longitude === "number";

    if (!validPin || !validCoords) {
      setServiceability("idle");
      setServiceableArea(null);
      return;
    }

    setServiceability("checking");
    try {
      const params = new URLSearchParams({
        latitude: String(coords.latitude),
        longitude: String(coords.longitude),
        pinCode: pin.trim(),
      });
      const res = await fetch(`/api/serviceability?${params}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (checkId !== checkIdRef.current) return; // stale response
      if (!res.ok || !json.success) {
        setServiceability("error");
        return;
      }
      if (json.data?.serviceable) {
        setServiceableArea(json.data.location?.name ?? null);
        setServiceability("serviceable");
      } else {
        setServiceableArea(null);
        setServiceability("not_serviceable");
      }
    } catch {
      if (checkId !== checkIdRef.current) return;
      setServiceability("error");
    }
  }

  /** Reverse geocode with cache + in-flight coalescing (identical coords). */
  async function fetchReverseGeocode(
    coords: MapCoords
  ): Promise<GeocodeResult | null> {
    const key = coordKey(coords);

    if (lastGeocodeKeyRef.current === key && lastGeocodeResultRef.current) {
      return lastGeocodeResultRef.current;
    }
    if (inflightKeyRef.current === key && inflightPromiseRef.current) {
      return inflightPromiseRef.current;
    }

    const request = (async (): Promise<GeocodeResult | null> => {
      try {
        const params = new URLSearchParams({
          latitude: String(coords.latitude),
          longitude: String(coords.longitude),
        });
        const res = await fetch(`/api/geocode/reverse?${params}`, {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as {
          success?: boolean;
          data?: Partial<GeocodeResult>;
        } | null;
        if (!res.ok || !json?.success || !json.data) return null;
        return {
          city: typeof json.data.city === "string" ? json.data.city : "",
          state: typeof json.data.state === "string" ? json.data.state : "",
          pinCode:
            typeof json.data.pinCode === "string" ? json.data.pinCode : "",
        };
      } catch {
        return null;
      } finally {
        if (inflightKeyRef.current === key) {
          inflightKeyRef.current = null;
          inflightPromiseRef.current = null;
        }
      }
    })();

    inflightKeyRef.current = key;
    inflightPromiseRef.current = request;

    const result = await request;
    if (result) {
      lastGeocodeKeyRef.current = key;
      lastGeocodeResultRef.current = result;
    }
    return result;
  }

  /**
   * Fills City / State / PIN from coordinates. Never fabricates values —
   * when the lookup fails or fields are missing the user enters them
   * manually (a notice explains what happened).
   */
  async function resolveAddressForCoords(
    coords: MapCoords
  ): Promise<GeocodeOutcome> {
    const seq = ++geocodeSeqRef.current;
    setGeocodeNotice(null);

    const result = await fetchReverseGeocode(coords);

    if (seq !== geocodeSeqRef.current) {
      return { ok: result !== null, filled: false, superseded: true };
    }

    if (!result) {
      setGeocodeNotice(GEOCODE_NOTICE);
      return { ok: false, filled: false, superseded: false };
    }

    setAddress((prev) => ({
      ...prev,
      city: result.city,
      state: matchIndianState(result.state) ?? "",
      pinCode: sanitizePin(result.pinCode),
    }));
    setErrors((prev) =>
      prev.city || prev.state || prev.pinCode
        ? { ...prev, city: undefined, state: undefined, pinCode: undefined }
        : prev
    );

    const filled = hasAnyAddressValue(result);
    if (!filled) setGeocodeNotice(GEOCODE_NOTICE);

    // Serviceability preview should reflect the freshly detected PIN too.
    runServiceabilityCheck(
      coords,
      sanitizePin(result.pinCode) || addressRef.current.pinCode
    );

    return { ok: true, filled, superseded: false };
  }

  /** Debounced lookup after the user moves the map. */
  function scheduleReverseGeocode(coords: MapCoords) {
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    geocodeTimerRef.current = setTimeout(() => {
      geocodeTimerRef.current = null;
      void resolveAddressForCoords(coords);
    }, GEOCODE_DEBOUNCE_MS);
  }

  /** Map stopped moving after user interaction: store coords, then look up. */
  const handleCoordsChange = (coords: MapCoords) => {
    const current = addressRef.current;
    if (
      current.latitude === coords.latitude &&
      current.longitude === coords.longitude
    ) {
      return;
    }

    setAddress((prev) => ({
      ...prev,
      latitude: coords.latitude,
      longitude: coords.longitude,
    }));
    setErrors((prev) =>
      prev.latitude || prev.longitude
        ? { ...prev, latitude: undefined, longitude: undefined }
        : prev
    );
    setGeoError(null);
    runServiceabilityCheck(coords, current.pinCode);
    scheduleReverseGeocode(coords);
  };

  const handleCurrentLocation = () => {
    if (geoBusyRef.current) return;

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError(GEO_MESSAGES.unsupported);
      return;
    }

    const requestId = ++geoRequestIdRef.current;
    geoBusyRef.current = true;
    setGeoError(null);
    setGeocodeNotice(null);
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    setLocateState("locating");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (requestId !== geoRequestIdRef.current) return;

        const coords: MapCoords = {
          latitude: round6(pos.coords.latitude),
          longitude: round6(pos.coords.longitude),
        };

        // 1-2. Store real coordinates — the value prop recenters the map
        // and moves the marker to the GPS position.
        setAddress((prev) => ({ ...prev, ...coords }));
        setErrors((prev) => ({ ...prev, latitude: undefined, longitude: undefined }));
        runServiceabilityCheck(coords, addressRef.current.pinCode);

        // 3. Reverse geocode → auto-fill City / State / PIN.
        setLocateState("geocoding");
        void resolveAddressForCoords(coords).then((outcome) => {
          if (requestId !== geoRequestIdRef.current) return;
          geoBusyRef.current = false;

          if (!outcome.ok || outcome.superseded) {
            // resolveAddressForCoords already surfaced the notice (unless a
            // newer lookup owns the messaging).
            setLocateState("idle");
            return;
          }

          setLocateState("success");
          successTimerRef.current = setTimeout(() => {
            successTimerRef.current = null;
            if (requestId === geoRequestIdRef.current) setLocateState("idle");
          }, GEO_SUCCESS_RESET_MS);
        });
      },
      (error) => {
        if (requestId !== geoRequestIdRef.current) return;
        geoBusyRef.current = false;
        setLocateState("idle");
        setGeoError(geoErrorMessage(error.code));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof PickupAddress, string>> = {};

    if (!address.fullName.trim()) {
      newErrors.fullName = "Please enter your full name.";
    } else if (address.fullName.trim().length > 100) {
      newErrors.fullName = "Name must be under 100 characters.";
    }

    if (!address.phone.trim()) {
      newErrors.phone = "Please enter your phone number.";
    } else if (!/^[6-9]\d{9}$/.test(address.phone.trim())) {
      newErrors.phone = "Please enter a valid 10-digit Indian phone number.";
    }

    if (!address.houseFlatBuilding.trim()) {
      newErrors.houseFlatBuilding =
        "Please enter your house/flat/building details.";
    }

    if (!address.streetArea.trim()) {
      newErrors.streetArea = "Please enter your street or area.";
    }

    if (!address.city.trim()) {
      newErrors.city = "Please enter your city.";
    }

    if (!address.state) {
      newErrors.state = "Please select your state.";
    }

    if (!address.pinCode.trim()) {
      newErrors.pinCode = "Please enter your PIN code.";
    } else if (!/^\d{6}$/.test(address.pinCode.trim())) {
      newErrors.pinCode = "Please enter a valid 6-digit PIN code.";
    }

    const latMissing =
      typeof address.latitude !== "number" || !Number.isFinite(address.latitude);
    const lngMissing =
      typeof address.longitude !== "number" ||
      !Number.isFinite(address.longitude);

    if (latMissing || lngMissing) {
      newErrors.latitude = NO_COORDS_ERROR;
      newErrors.longitude = NO_COORDS_ERROR;
    } else if (address.latitude! < -90 || address.latitude! > 90) {
      newErrors.latitude = "Latitude must be between -90 and 90.";
    } else if (address.longitude! < -180 || address.longitude! > 180) {
      newErrors.longitude = "Longitude must be between -180 and 180.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onNext(address);
    }
  };

  const inputClass = (hasError?: string) =>
    cn(
      "w-full rounded-lg border bg-card px-4 py-2.5 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary",
      hasError ? "border-destructive" : "border-border"
    );

  const locating = locateState === "locating" || locateState === "geocoding";
  const spinner = (
    <Loader2
      className="h-4 w-4 animate-spin motion-reduce:animate-none"
      aria-hidden="true"
    />
  );

  const locationButtonContent = {
    idle: { icon: <MapPin className="h-4 w-4" aria-hidden="true" />, label: "Pickup My Current Location" },
    locating: { icon: spinner, label: "Detecting Location..." },
    geocoding: { icon: spinner, label: "Getting Address..." },
    success: { icon: <CheckCircle className="h-4 w-4" aria-hidden="true" />, label: "Location Detected" },
  }[locateState];

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2 className="text-2xl font-bold text-foreground">Pickup Location</h2>
      <p className="mt-2 text-muted">
        Pin your exact pickup spot on the map, then confirm the address.
      </p>

      <div className="mt-6 space-y-5">
        {/* Map */}
        <div>
          <MapPicker
            value={
              typeof address.latitude === "number" &&
              typeof address.longitude === "number"
                ? { latitude: address.latitude, longitude: address.longitude }
                : null
            }
            onChange={handleCoordsChange}
          />
          {(errors.latitude || errors.longitude) && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {errors.latitude || errors.longitude}
            </p>
          )}
        </div>

        {/* Main location action */}
        <div>
          <button
            type="button"
            onClick={handleCurrentLocation}
            disabled={locating}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            )}
          >
            {locationButtonContent.icon}
            {locationButtonContent.label}
          </button>

          {geoError && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {geoError}
            </p>
          )}
          {geocodeNotice && (
            <p className="mt-2 text-sm text-muted" role="status">
              {geocodeNotice}
            </p>
          )}
        </div>

        {/* Pickup point caption */}
        <div className="text-sm text-muted">
          <p className="font-medium text-foreground">Pickup Point</p>
          <p className="mt-0.5">
            Move the map so the pin sits on your pickup spot.
          </p>
        </div>

        {/* Advisory serviceability preview */}
        {serviceability === "checking" && (
          <div className="flex items-center gap-2 rounded-lg bg-muted-light px-4 py-3 text-sm text-muted">
            <Loader2
              className="h-4 w-4 animate-spin text-primary motion-reduce:animate-none"
              aria-hidden="true"
            />
            Checking serviceability…
          </div>
        )}
        {serviceability === "serviceable" && (
          <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary-light px-4 py-3 text-sm text-primary">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Great! We serve your location
              {serviceableArea ? ` (${serviceableArea})` : ""}.
            </span>
          </div>
        )}
        {serviceability === "not_serviceable" && (
          <div
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              We don&apos;t serve this location yet. Please adjust the map pin
              or check your PIN code.
            </span>
          </div>
        )}
        {serviceability === "error" && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Could not verify serviceability right now — we&apos;ll check again
              when you book.
            </span>
          </div>
        )}

        {/* Address details */}
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Address Type
          </label>
          <div className="flex gap-3">
            {(["home", "office", "other"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => updateField("addressType", type)}
                className={cn(
                  "rounded-lg border-2 px-4 py-2 text-sm font-medium capitalize transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  address.addressType === type
                    ? "border-primary bg-primary-light text-primary"
                    : "border-border bg-card text-muted hover:border-primary/30"
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="fullName"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            Full Name *
          </label>
          <input
            type="text"
            id="fullName"
            value={address.fullName}
            onChange={(e) => updateField("fullName", e.target.value)}
            className={inputClass(errors.fullName)}
            placeholder="Enter your full name"
          />
          {errors.fullName && (
            <p className="mt-1 text-sm text-destructive">{errors.fullName}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="phone"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            Phone Number *
          </label>
          <input
            type="tel"
            id="phone"
            value={address.phone}
            onChange={(e) =>
              updateField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            className={inputClass(errors.phone)}
            placeholder="10-digit phone number"
            maxLength={10}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-destructive">{errors.phone}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="houseFlatBuilding"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            House / Flat / Building *
          </label>
          <input
            type="text"
            id="houseFlatBuilding"
            value={address.houseFlatBuilding}
            onChange={(e) => updateField("houseFlatBuilding", e.target.value)}
            className={inputClass(errors.houseFlatBuilding)}
            placeholder="e.g., Flat 4B, Sunshine Apartments"
          />
          {errors.houseFlatBuilding && (
            <p className="mt-1 text-sm text-destructive">
              {errors.houseFlatBuilding}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="streetArea"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            Street / Area *
          </label>
          <input
            type="text"
            id="streetArea"
            value={address.streetArea}
            onChange={(e) => updateField("streetArea", e.target.value)}
            className={inputClass(errors.streetArea)}
            placeholder="e.g., MG Road, near Central Park"
          />
          {errors.streetArea && (
            <p className="mt-1 text-sm text-destructive">{errors.streetArea}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="landmark"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            Landmark
          </label>
          <input
            type="text"
            id="landmark"
            value={address.landmark}
            onChange={(e) => updateField("landmark", e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g., Opposite SBI Bank"
          />
        </div>

        <div>
          <label
            htmlFor="city"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            City *
          </label>
          <input
            type="text"
            id="city"
            value={address.city}
            onChange={(e) => updateField("city", e.target.value)}
            className={inputClass(errors.city)}
            placeholder="e.g., New Delhi"
          />
          {errors.city && (
            <p className="mt-1 text-sm text-destructive">{errors.city}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="state"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              State *
            </label>
            <select
              id="state"
              value={address.state}
              onChange={(e) => updateField("state", e.target.value)}
              className={cn(inputClass(errors.state), !address.state && "text-muted")}
            >
              <option value="" disabled>
                Select state
              </option>
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            {errors.state && (
              <p className="mt-1 text-sm text-destructive">{errors.state}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="pinCode"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              PIN Code *
            </label>
            <input
              type="text"
              id="pinCode"
              value={address.pinCode}
              onChange={(e) =>
                updateField(
                  "pinCode",
                  e.target.value.replace(/\D/g, "").slice(0, 6)
                )
              }
              className={inputClass(errors.pinCode)}
              placeholder="6-digit PIN code"
              maxLength={6}
            />
            {errors.pinCode && (
              <p className="mt-1 text-sm text-destructive">{errors.pinCode}</p>
            )}
          </div>
        </div>

        {typeof address.latitude === "number" &&
          typeof address.longitude === "number" && (
            <div className="flex items-center gap-2 rounded-lg bg-muted-light px-4 py-3 text-sm text-muted">
              <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Pickup point: {address.latitude.toFixed(5)},{" "}
                {address.longitude.toFixed(5)}
              </span>
            </div>
          )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Back
        </button>
        <button
          type="submit"
          className="rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Continue
        </button>
      </div>
    </form>
  );
}
