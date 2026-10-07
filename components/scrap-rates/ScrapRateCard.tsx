"use client";

import { useState } from "react";
import { Leaf, Recycle, RefreshCw } from "lucide-react";
import RemoteImage from "@/components/common/RemoteImage";
import type { PublicRateView } from "@/types/rates";

interface ScrapRateCardProps {
  rate: PublicRateView;
}

function supportsHover(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover)").matches
  );
}

export default function ScrapRateCard({ rate }: ScrapRateCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);

  const hasRange = Boolean(rate.maxRate) && rate.maxRate !== rate.minRate;
  const priceText = hasRange
    ? `\u20B9${rate.minRate}\u2013\u20B9${rate.maxRate}`
    : `\u20B9${rate.minRate}`;
  const description = rate.description?.trim();
  const showImage = Boolean(rate.imageUrl) && !imageBroken;
  const isActive = rate.isActive !== false;

  const cardShadow =
    "shadow-[0_1px_2px_rgba(16,24,40,0.06),0_16px_40px_-24px_rgba(16,24,40,0.25)]";

  return (
    <button
      type="button"
      className="group block w-full rounded-[28px] text-left [perspective:1200px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setFlipped(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setFlipped(false);
      }}
      onClick={(e) => {
        // Touch devices flip on tap, keyboard on Enter/Space (detail === 0).
        if (!supportsHover() || e.detail === 0) setFlipped((v) => !v);
      }}
      aria-pressed={flipped}
      aria-label={`Show details for ${rate.name}`}
    >
      <div
        className="relative transition-transform duration-500 ease-out [transform-style:preserve-3d] motion-reduce:transition-none"
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* ── Front ── */}
        <div
          className={`flex flex-col overflow-hidden rounded-[28px] border border-black/[0.06] bg-[#F5F6F8] [backface-visibility:hidden] ${cardShadow}`}
        >
          <div className="px-5 pt-6 pb-1 text-center">
            <h3 className="text-lg font-bold leading-snug text-[#1F2937] sm:text-xl">
              {rate.name}
            </h3>
          </div>

          <div className="flex h-44 items-center justify-center px-6 pb-3 sm:h-52">
            {showImage ? (
              <RemoteImage
                src={rate.imageUrl as string}
                alt={rate.name}
                className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
                onError={() => setImageBroken(true)}
              />
            ) : (
              <Recycle
                className="h-16 w-16 text-[#C9CED6]"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            )}
          </div>

          <div className="mx-3 mb-3 flex items-center justify-between gap-3 rounded-2xl bg-[#E9EBEF] px-4 py-3">
            <p className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold tracking-tight text-[#111827]">
                {priceText}
              </span>
              <span className="text-xs font-semibold text-[#6B7280]">
                /{rate.unit}
              </span>
            </p>
            <RefreshCw
              className="h-4 w-4 shrink-0 text-[#9CA3AF]"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* ── Back (description) ── */}
        <div
          className={`absolute inset-0 flex flex-col overflow-hidden rounded-[28px] border border-primary/15 bg-[#E7F6EC] p-5 [backface-visibility:hidden] [transform:rotateY(180deg)] ${cardShadow}`}
        >
          <div className="flex flex-1 items-center justify-center text-center">
            <p className="text-sm font-bold leading-relaxed text-primary sm:text-base">
              {description ?? rate.name}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex max-w-[68%] items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-primary">
              <Leaf className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{rate.category}</span>
            </span>

            {isActive && (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-brand-cyan px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-foreground shadow-sm">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-foreground"
                  aria-hidden="true"
                />
                Active
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
