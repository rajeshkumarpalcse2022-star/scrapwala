"use client";

import Link from "next/link";
import { MapPin, Clock, Package, IndianRupee } from "lucide-react";
import PickupStatusBadge from "./PickupStatusBadge";

interface RealPickupCustomer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
}

interface RealPickupAddress {
  fullName: string;
  houseFlatBuilding: string;
  streetArea: string;
  city: string;
  state: string;
  pinCode: string;
}

interface RealPickupTimeSlot {
  startTime: string;
  endTime: string;
}

interface RealPickupItem {
  categoryName: string;
  estimatedWeight: number;
  unit: string;
  amount: number;
}

export interface RealPickup {
  _id: string;
  pickupId: string;
  customer: RealPickupCustomer;
  address: RealPickupAddress;
  scheduledDate: string;
  timeSlot: RealPickupTimeSlot;
  status: string;
  items: RealPickupItem[];
  estimatedAmount: number;
  notes?: string;
}

interface PickupCardProps {
  pickup: RealPickup;
  showActions?: boolean;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(timeSlot: { startTime: string; endTime: string }): string {
  return `${timeSlot.startTime} - ${timeSlot.endTime}`;
}

function formatAddress(address: RealPickupAddress): string {
  const parts = [address.houseFlatBuilding, address.streetArea, address.city];
  return parts.filter(Boolean).join(", ");
}

function formatEstimatedQuantity(items: RealPickupItem[]): string {
  const totalWeight = items.reduce((sum, item) => sum + item.estimatedWeight, 0);
  if (totalWeight > 0) {
    return `${totalWeight} kg`;
  }
  return `${items.length} item${items.length !== 1 ? "s" : ""}`;
}

function formatEstimatedValue(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function PickupCard({ pickup }: PickupCardProps) {
  const categories = pickup.items.map((item) => item.categoryName);

  return (
    <Link
      href={`/collector/pickups/${pickup.pickupId}`}
      className="block rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500">{pickup.pickupId}</p>
          <h3 className="mt-1 text-sm font-semibold text-gray-900">
            {pickup.customer?.name ?? "Unknown"}
          </h3>
        </div>
        <PickupStatusBadge status={pickup.status as never} />
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
          {formatAddress(pickup.address)}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="h-4 w-4 shrink-0 text-gray-400" />
          {formatDate(pickup.scheduledDate)} at {formatTime(pickup.timeSlot)}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Package className="h-4 w-4 shrink-0 text-gray-400" />
          {formatEstimatedQuantity(pickup.items)}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <IndianRupee className="h-4 w-4 shrink-0 text-gray-400" />
          {formatEstimatedValue(pickup.estimatedAmount)}
        </div>
      </div>

      {categories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <span
              key={cat}
              className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600"
            >
              {cat}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
