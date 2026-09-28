"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import type {
  PickupAddress,
  PickupDate,
  ScrapCatalogGroup,
  ScrapRate,
  SelectedVehicle,
  TimeSlot,
} from "@/types/pickup";
import {
  PICKUP_STEPS,
  REVIEW_STEP,
  SUCCESS_STEP,
} from "@/types/pickup";
import { useAuth } from "@/hooks/useAuth";
import PickupProgress from "@/components/pickup/PickupProgress";
import VehicleSelection from "@/components/pickup/VehicleSelection";
import LocationStep from "@/components/pickup/LocationStep";
import ScrapSelection from "@/components/pickup/ScrapSelection";
import WeightSelection from "@/components/pickup/WeightSelection";
import RateStep from "@/components/pickup/RateStep";
import DateSelection from "@/components/pickup/DateSelection";
import TimeSlotSelection from "@/components/pickup/TimeSlotSelection";
import PickupSummary from "@/components/pickup/PickupSummary";
import PickupConfirmation from "@/components/pickup/PickupConfirmation";
import { Loader2, ShieldAlert } from "lucide-react";

interface ConfirmedPickup {
  pickupId: string;
  status: string;
  vehicle?: string;
  scheduledDate: string;
  timeSlot: { startTime: string; endTime: string };
  address: {
    fullName: string;
    phone: string;
    houseFlatBuilding: string;
    streetArea: string;
    landmark?: string;
    city: string;
    state: string;
    pinCode: string;
    latitude?: number;
    longitude?: number;
  };
  items: {
    categoryName: string;
    rate: number;
    unit: string;
    estimatedWeight: number;
    amount: number;
  }[];
  expectedWeight?: string;
  estimatedAmount: number;
}

export default function PickupPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);

  const [catalog, setCatalog] = useState<ScrapCatalogGroup[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogReloadKey, setCatalogReloadKey] = useState(0);

  const [rates, setRates] = useState<ScrapRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [ratesReloadKey, setRatesReloadKey] = useState(0);

  const [vehicle, setVehicle] = useState<SelectedVehicle | null>(null);
  const [selectedScrap, setSelectedScrap] = useState<string[]>([]);
  const [address, setAddress] = useState<PickupAddress | null>(null);
  const [expectedWeight, setExpectedWeight] = useState<string | null>(null);
  const [pickupDate, setPickupDate] = useState<PickupDate | null>(null);
  const [timeSlot, setTimeSlot] = useState<TimeSlot | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedPickup, setConfirmedPickup] =
    useState<ConfirmedPickup | null>(null);

  // Load scrap catalog (active parents only via GET /api/categories).
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/categories", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to load scrap categories.");
        }

        const categories: ScrapCatalogGroup[] = json.data?.categories || [];
        const groups: ScrapCatalogGroup[] = await Promise.all(
          categories.map(async (cat) => {
            const subRes = await fetch(
              `/api/categories/${cat.id}/subcategories`,
              { cache: "no-store" }
            );
            const subJson = await subRes.json();
            if (!subRes.ok || !subJson.success) {
              throw new Error(
                subJson.message || "Failed to load scrap items."
              );
            }
            return { ...cat, subcategories: subJson.data?.subcategories || [] };
          })
        );

        if (cancelled) return;
        setCatalog(groups);
        setCatalogError(null);
      } catch (err) {
        if (cancelled) return;
        setCatalog([]);
        setCatalogError(
          err instanceof Error ? err.message : "Unable to load scrap items."
        );
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [catalogReloadKey]);

  // Load active public rates (rate step + review display).
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setRatesLoading(true);
      try {
        const res = await fetch("/api/rates", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to load scrap rates.");
        }
        setRates(json.data?.rates ?? []);
        setRatesError(null);
      } catch (err) {
        if (cancelled) return;
        setRates([]);
        setRatesError(
          err instanceof Error ? err.message : "Unable to load scrap rates."
        );
      } finally {
        if (!cancelled) setRatesLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [ratesReloadKey]);

  const itemNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const group of catalog) {
      for (const sub of group.subcategories) {
        map[sub.id] = sub.name;
      }
    }
    return map;
  }, [catalog]);

  const retryCatalog = () => {
    setCatalogLoading(true);
    setCatalogError(null);
    setCatalogReloadKey((key) => key + 1);
  };

  const retryRates = () => {
    setRatesLoading(true);
    setRatesError(null);
    setRatesReloadKey((key) => key + 1);
  };

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleVehicleNext = (v: SelectedVehicle) => {
    setVehicle(v);
    goToStep(2);
  };

  const handleLocationNext = (addr: PickupAddress) => {
    setAddress(addr);
    goToStep(3);
  };

  const handleScrapNext = (selected: string[]) => {
    setSelectedScrap(selected);
    goToStep(4);
  };

  const handleWeightNext = (weight: string) => {
    setExpectedWeight(weight);
    goToStep(5);
  };

  const handleRateNext = () => goToStep(6);

  const handleDateNext = (date: PickupDate) => {
    setPickupDate(date);
    goToStep(7);
  };

  const handleTimeNext = (slot: TimeSlot) => {
    setTimeSlot(slot);
    goToStep(REVIEW_STEP);
  };

  const handleConfirm = async () => {
    if (!vehicle || !address || !pickupDate || !timeSlot || !expectedWeight) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const items = selectedScrap.map((id) => {
        const name = itemNames[id];
        if (!name) {
          throw new Error(
            "One of your selected scrap items is no longer available. Please review your selection."
          );
        }
        return {
          category: id,
          categoryName: name,
          rate: 0,
          unit: "kg",
          estimatedWeight: 0,
          amount: 0,
        };
      });

      const scheduledDate = new Date(pickupDate.date);
      scheduledDate.setHours(0, 0, 0, 0);

      const response = await fetch("/api/pickups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle: vehicle.id,
          address: {
            fullName: address.fullName,
            phone: address.phone,
            houseFlatBuilding: address.houseFlatBuilding,
            streetArea: address.streetArea,
            landmark: address.landmark || undefined,
            city: address.city,
            state: address.state,
            pinCode: address.pinCode,
            latitude: address.latitude,
            longitude: address.longitude,
          },
          scheduledDate: scheduledDate.toISOString(),
          timeSlot: {
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime,
          },
          items,
          expectedWeight,
          estimatedAmount: 0,
          notes: undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Please log in to book a pickup.");
        }
        throw new Error(result.message || "Failed to create pickup");
      }

      setConfirmedPickup(result.data);
      goToStep(SUCCESS_STEP);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditVehicle = () => goToStep(1);
  const handleEditLocation = () => goToStep(2);
  const handleEditScrap = () => goToStep(3);
  const handleEditWeight = () => goToStep(4);
  const handleEditRates = () => goToStep(5);
  const handleEditDateTime = () => goToStep(6);

  const renderAuthGate = () => {
    if (authLoading) {
      return (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-12 text-sm text-muted shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          Checking your session…
        </div>
      );
    }

    if (!user) {
      return (
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <ShieldAlert className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-foreground">
            Login to schedule a pickup
          </h2>
          <p className="mt-2 text-sm text-muted">
            Book doorstep scrap pickups, track collectors and get paid — all in
            one place.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="w-full rounded-lg bg-primary px-8 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:w-auto"
            >
              Login / Signup
            </Link>
            <Link
              href="/"
              className="w-full rounded-lg border border-border px-8 py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:w-auto"
            >
              Back to Home
            </Link>
          </div>
        </div>
      );
    }

    if (user.role !== "user") {
      return (
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <ShieldAlert className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-foreground">
            Customer accounts only
          </h2>
          <p className="mt-2 text-sm text-muted">
            Pickup booking is available for customer accounts. Your current
            account has dashboard access instead.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={user.role === "admin" ? "/admin" : "/collector"}
              className="w-full rounded-lg bg-primary px-8 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:w-auto"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      );
    }

    return null;
  };

  const authGate = renderAuthGate();

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {authGate ? (
          authGate
        ) : (
          <>
            <PickupProgress steps={PICKUP_STEPS} currentStep={currentStep} />

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              {currentStep === 1 && (
                <VehicleSelection
                  selected={vehicle}
                  onNext={handleVehicleNext}
                />
              )}

              {currentStep === 2 && (
                <LocationStep
                  initialData={address}
                  onNext={handleLocationNext}
                  onBack={() => goToStep(1)}
                />
              )}

              {currentStep === 3 && (
                <ScrapSelection
                  groups={catalog}
                  isLoading={catalogLoading}
                  error={catalogError}
                  onRetry={retryCatalog}
                  selectedScrap={selectedScrap}
                  onNext={handleScrapNext}
                  onBack={() => goToStep(2)}
                />
              )}

              {currentStep === 4 && (
                <WeightSelection
                  selected={expectedWeight}
                  onNext={handleWeightNext}
                  onBack={() => goToStep(3)}
                />
              )}

              {currentStep === 5 && (
                <RateStep
                  selectedScrap={selectedScrap}
                  itemNames={itemNames}
                  rates={rates}
                  isLoading={ratesLoading}
                  error={ratesError}
                  onRetry={retryRates}
                  onNext={handleRateNext}
                  onBack={() => goToStep(4)}
                />
              )}

              {currentStep === 6 && (
                <DateSelection
                  selectedDate={pickupDate}
                  onNext={handleDateNext}
                  onBack={() => goToStep(5)}
                />
              )}

              {currentStep === 7 && (
                <TimeSlotSelection
                  selectedSlot={timeSlot}
                  onNext={handleTimeNext}
                  onBack={() => goToStep(6)}
                />
              )}

              {currentStep === REVIEW_STEP &&
                vehicle &&
                address &&
                pickupDate &&
                timeSlot &&
                expectedWeight && (
                  <PickupSummary
                    vehicle={vehicle}
                    selectedScrap={selectedScrap}
                    itemNames={itemNames}
                    address={address}
                    expectedWeight={expectedWeight}
                    rates={rates}
                    pickupDate={pickupDate}
                    timeSlot={timeSlot}
                    onEditVehicle={handleEditVehicle}
                    onEditLocation={handleEditLocation}
                    onEditScrap={handleEditScrap}
                    onEditWeight={handleEditWeight}
                    onEditRates={handleEditRates}
                    onEditDateTime={handleEditDateTime}
                    onConfirm={handleConfirm}
                    isSubmitting={isSubmitting}
                    error={submitError}
                  />
                )}

              {currentStep === SUCCESS_STEP && confirmedPickup && (
                <PickupConfirmation pickup={confirmedPickup} />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
