"use client";

import { useRef, useState } from "react";
import type { PickupAddress } from "@/types/pickup";
import { INDIAN_STATES } from "@/lib/constants/pickup";
import { cn } from "@/lib/utils";
import MapPicker from "@/components/pickup/MapPicker";
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
  const checkIdRef = useRef(0);

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

  const handleConfirmLocation = (coords: {
    latitude: number;
    longitude: number;
  }) => {
    setAddress((prev) => ({
      ...prev,
      latitude: coords.latitude,
      longitude: coords.longitude,
    }));
    setErrors((prev) => ({ ...prev, latitude: undefined, longitude: undefined }));
    runServiceabilityCheck(
      { latitude: coords.latitude, longitude: coords.longitude },
      address.pinCode
    );
  };

  // Advisory serviceability preview — event-driven (map confirm / PIN entry);
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

    if (typeof address.latitude !== "number" || typeof address.longitude !== "number") {
      newErrors.latitude = "Please confirm your pickup location on the map.";
      newErrors.longitude = "Please confirm your pickup location on the map.";
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
            onConfirm={handleConfirmLocation}
          />
          {errors.latitude && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {errors.latitude}
            </p>
          )}
        </div>

        {/* Advisory serviceability preview */}
        {serviceability === "checking" && (
          <div className="flex items-center gap-2 rounded-lg bg-muted-light px-4 py-3 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
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
