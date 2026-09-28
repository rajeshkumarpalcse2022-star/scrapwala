"use client";

import {
  CheckCircle,
  MapPin,
  Calendar,
  Clock,
  User,
  Phone,
  Home,
  Package,
  Truck,
  Weight,
  Activity,
} from "lucide-react";
import Link from "next/link";
import PickupTimeline from "@/components/pickup/PickupTimeline";

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

interface PickupConfirmationProps {
  pickup: ConfirmedPickup;
}

function formatTime(t: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(t);
  if (!match) return t;
  const hours = Number(match[1]);
  const minutes = match[2];
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;
  return `${String(hour).padStart(2, "0")}:${minutes} ${suffix}`;
}

export default function PickupConfirmation({ pickup }: PickupConfirmationProps) {
  const formatDateFull = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="text-center">
      {/* Success Icon */}
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <CheckCircle className="h-10 w-10 text-primary" aria-hidden="true" />
      </div>

      <h2 className="mt-6 text-2xl font-bold text-foreground">
        Pickup Booked Successfully!
      </h2>
      <p className="mt-2 text-muted">
        Your scrap pickup request has been confirmed. Our team will assign a collector soon.
      </p>

      {/* Booking Details */}
      <div className="mx-auto mt-8 max-w-md space-y-4 text-left">
        {/* Booking Reference */}
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted">Booking Reference</p>
          <p className="mt-1 text-lg font-bold text-primary">
            {pickup.pickupId}
          </p>
          <p className="mt-1 text-xs capitalize text-muted">
            Status: {pickup.status.replace(/_/g, " ")}
          </p>
        </div>

        {/* Vehicle & Weight */}
        {(pickup.vehicle || pickup.expectedWeight) && (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="space-y-2">
              {pickup.vehicle && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Truck className="h-4 w-4" aria-hidden="true" />
                  <span className="capitalize">{pickup.vehicle} vehicle</span>
                </div>
              )}
              {pickup.expectedWeight && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Weight className="h-4 w-4" aria-hidden="true" />
                  <span>Expected weight: {pickup.expectedWeight}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scrap Items */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted" aria-hidden="true" />
            <p className="text-sm text-muted">Scrap Items</p>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {pickup.items.map((item, i) => (
              <span
                key={i}
                className="rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-primary"
              >
                {item.categoryName}
              </span>
            ))}
          </div>
        </div>

        {/* Date & Time */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Calendar className="h-4 w-4" aria-hidden="true" />
              <span>{formatDateFull(pickup.scheduledDate)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted">
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span>
                {formatTime(pickup.timeSlot.startTime)} -{" "}
                {formatTime(pickup.timeSlot.endTime)}
              </span>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted">
              <User className="h-4 w-4" aria-hidden="true" />
              <span>{pickup.address.fullName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted">
              <Phone className="h-4 w-4" aria-hidden="true" />
              <span>{pickup.address.phone}</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-muted">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {pickup.address.houseFlatBuilding}, {pickup.address.streetArea}
                {pickup.address.landmark && `, ${pickup.address.landmark}`},{" "}
                {pickup.address.city}, {pickup.address.state} -{" "}
                {pickup.address.pinCode}
              </span>
            </div>
          </div>
        </div>

        {/* Status timeline (shared with tracking page — real Pickup.status) */}
        <PickupTimeline status={pickup.status} />
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/"
          className="w-full rounded-lg border border-border px-8 py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:w-auto"
        >
          <Home className="mr-2 inline h-4 w-4" aria-hidden="true" />
          Back to Home
        </Link>
        <Link
          href={`/pickup/${pickup.pickupId}`}
          className="w-full rounded-lg border border-primary px-8 py-3 text-center text-sm font-semibold text-primary transition-colors hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:w-auto"
        >
          <Activity className="mr-2 inline h-4 w-4" aria-hidden="true" />
          View Pickup Status
        </Link>
        <Link
          href="/pickup"
          className="w-full rounded-lg bg-primary px-8 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:w-auto"
        >
          Schedule Another Pickup
        </Link>
      </div>
    </div>
  );
}
