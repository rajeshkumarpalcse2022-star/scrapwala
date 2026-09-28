"use client";

import {
  Newspaper,
  FileText,
  Package,
  Recycle,
  Cpu,
  Monitor,
  Refrigerator,
  WashingMachine,
  Bike,
  Car,
  Zap,
  CircleDot,
} from "lucide-react";
import RemoteImage from "@/components/common/RemoteImage";
import type { PublicRateView } from "@/types/rates";

function ScrapIcon({ name, category }: { name: string; category: string }) {
  const n = name.toLowerCase();
  if (n.includes("newspaper") || n.includes("office"))
    return <Newspaper className="h-6 w-6 text-primary" strokeWidth={1.8} aria-hidden="true" />;
  if (n.includes("book"))
    return <FileText className="h-6 w-6 text-primary" strokeWidth={1.8} aria-hidden="true" />;
  if (n.includes("cardboard"))
    return <Package className="h-6 w-6 text-primary" strokeWidth={1.8} aria-hidden="true" />;
  if (n.includes("plastic") || n.includes("pet"))
    return <Recycle className="h-6 w-6 text-primary" strokeWidth={1.8} aria-hidden="true" />;
  if (n.includes("laptop") || n.includes("printer"))
    return <Cpu className="h-6 w-6 text-primary" strokeWidth={1.8} aria-hidden="true" />;
  if (n.includes("monitor") || n.includes("tv"))
    return <Monitor className="h-6 w-6 text-primary" strokeWidth={1.8} aria-hidden="true" />;
  if (n.includes("refrigerator") || n.includes("fridge"))
    return <Refrigerator className="h-6 w-6 text-primary" strokeWidth={1.8} aria-hidden="true" />;
  if (n.includes("washing"))
    return <WashingMachine className="h-6 w-6 text-primary" strokeWidth={1.8} aria-hidden="true" />;
  if (n.includes("microwave"))
    return <Zap className="h-6 w-6 text-primary" strokeWidth={1.8} aria-hidden="true" />;
  if (n.includes("fan"))
    return <CircleDot className="h-6 w-6 text-primary" strokeWidth={1.8} aria-hidden="true" />;
  if (n.includes("scooter") || n.includes("bike"))
    return <Bike className="h-6 w-6 text-primary" strokeWidth={1.8} aria-hidden="true" />;
  if (n.includes("car"))
    return <Car className="h-6 w-6 text-primary" strokeWidth={1.8} aria-hidden="true" />;

  const c = category.toLowerCase();
  if (c.includes("metal") || c.includes("iron"))
    return <CircleDot className="h-6 w-6 text-primary" strokeWidth={1.8} aria-hidden="true" />;
  if (c.includes("waste") || c.includes("electronic"))
    return <Cpu className="h-6 w-6 text-primary" strokeWidth={1.8} aria-hidden="true" />;
  if (c.includes("appliance"))
    return <Refrigerator className="h-6 w-6 text-primary" strokeWidth={1.8} aria-hidden="true" />;

  return <Recycle className="h-6 w-6 text-primary" strokeWidth={1.8} aria-hidden="true" />;
}

interface ScrapRateCardProps {
  rate: PublicRateView;
}

export default function ScrapRateCard({ rate }: ScrapRateCardProps) {
  const priceText = rate.maxRate
    ? `\u20B9${rate.minRate} \u2013 \u20B9${rate.maxRate}`
    : `\u20B9${rate.minRate}`;

  return (
    <div className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5">
      {/* Image / Icon */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary/10 transition-transform group-hover:scale-110">
          {rate.imageUrl ? (
            <RemoteImage
              src={rate.imageUrl}
              alt={rate.name}
              className="h-10 w-10 object-contain"
            />
          ) : (
            <ScrapIcon name={rate.name} category={rate.category} />
          )}
        </div>
      </div>

      {/* Name + Description */}
      <h3 className="text-base font-semibold text-foreground">{rate.name}</h3>
      {rate.description && (
        <p className="mt-1 text-xs leading-relaxed text-muted">{rate.description}</p>
      )}

      {/* Price */}
      <div className="mt-auto pt-4">
        <span className="text-2xl font-bold tracking-tight text-primary">{priceText}</span>
        <span className="ml-1 text-sm text-muted">/ {rate.unit}</span>
      </div>

      {/* Category tag */}
      <div className="mt-3">
        <span className="inline-block rounded-full bg-muted-light px-2.5 py-0.5 text-[11px] font-medium text-muted">
          {rate.category}
        </span>
      </div>
    </div>
  );
}
